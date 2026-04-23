package com.ember.ember.admin.service.analytics;

import com.ember.ember.admin.dto.analytics.AiPerformanceResponse;
import com.ember.ember.admin.dto.analytics.JourneyDurationResponse;
import com.ember.ember.admin.dto.analytics.KeywordTopResponse;
import com.ember.ember.admin.dto.analytics.MatchingDiversityResponse;
import com.ember.ember.admin.dto.analytics.MatchingFunnelResponse;
import com.ember.ember.admin.dto.analytics.MatchingFunnelResponse.DailyFunnelPoint;
import com.ember.ember.admin.dto.analytics.MatchingFunnelResponse.Meta;
import com.ember.ember.admin.dto.analytics.MatchingFunnelResponse.Period;
import com.ember.ember.admin.dto.analytics.MatchingFunnelResponse.StageTotals;
import com.ember.ember.admin.dto.analytics.SegmentOverviewResponse;
import com.ember.ember.admin.dto.analytics.UserFunnelResponse;
import com.ember.ember.admin.repository.analytics.AnalyticsAiPerformanceRepository;
import com.ember.ember.admin.repository.analytics.AnalyticsFunnelRepository;
import com.ember.ember.admin.repository.analytics.AnalyticsJourneyRepository;
import com.ember.ember.admin.repository.analytics.AnalyticsKeywordRepository;
import com.ember.ember.admin.repository.analytics.AnalyticsMatchingDiversityRepository;
import com.ember.ember.admin.repository.analytics.AnalyticsSegmentRepository;
import com.ember.ember.admin.repository.analytics.AnalyticsUserFunnelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * 관리자 분석 서비스 — 관리자 API v2.1 §18 / 설계서 §3 전반.
 *
 * 구현 범위:
 *   - §18.1 매칭 퍼널                (B-1.1, 본 클래스 최초 구현)
 *   - §3.2  사용자 퍼널·코호트        (B-1.2)
 *   - §3.3  키워드 TopN              (B-1.3)
 *   - §3.4  세그먼트 Overview         (B-1.4)
 *   - §3.5  여정 소요시간 분포        (B-1.5, Fallback)
 *   - §3.6  AI 성능                  (B-1.6, DB Fallback — Prometheus 별도)
 *   - §3.7  매칭 통계 보조            (B-1.7, 추천 다양성·재추천)
 *
 * 설계 준수 사항:
 *   - 분모·분자 분리: 일별 포인트는 raw count, 합계에서만 비율 계산.
 *   - Point-in-time: created_at / matched_at / confirmed_at / occurred_at 그대로 사용.
 *   - Half-open interval: [startDate, endDateExclusive).
 *   - KST 처리: 일별 버킷은 AT TIME ZONE 'Asia/Seoul' → DATE 캐스팅.
 *   - k-anonymity: 세그먼트·키워드 집계에서 kMin(기본 5) 미만은 masked 또는 필터.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminAnalyticsService {

    private static final String TZ = "Asia/Seoul";
    private static final int K_ANON_MIN = 5;
    private static final int PROFILE_DONE_STEP = 1;
    private static final int RERECOMMENDATION_WINDOW_DAYS = 14;

    private final AnalyticsFunnelRepository funnelRepository;
    private final AnalyticsUserFunnelRepository userFunnelRepository;
    private final AnalyticsKeywordRepository keywordRepository;
    private final AnalyticsSegmentRepository segmentRepository;
    private final AnalyticsJourneyRepository journeyRepository;
    private final AnalyticsAiPerformanceRepository aiPerformanceRepository;
    private final AnalyticsMatchingDiversityRepository matchingDiversityRepository;

    // =========================================================================
    // §18.1 매칭 퍼널 (B-1.1)
    // =========================================================================

    public MatchingFunnelResponse getMatchingFunnel(LocalDate startDate,
                                                    LocalDate endDate,
                                                    String gender) {
        LocalDate endExclusive = endDate.plusDays(1);
        String genderFilter = (gender == null || "ALL".equalsIgnoreCase(gender))
                ? null : gender.toUpperCase(Locale.ROOT);

        List<Object[]> rows = funnelRepository.aggregateDailyFunnel(startDate, endExclusive, genderFilter);

        List<DailyFunnelPoint> daily = new ArrayList<>(rows.size());
        long sumRecs = 0, sumAccepts = 0, sumExchanges = 0, sumCouples = 0;

        for (Object[] row : rows) {
            LocalDate d = toLocalDate(row[0]);
            long recs      = toLong(row[1]);
            long accepts   = toLong(row[2]);
            long exchanges = toLong(row[3]);
            long couples   = toLong(row[4]);

            daily.add(new DailyFunnelPoint(d, recs, accepts, exchanges, couples));

            sumRecs += recs;
            sumAccepts += accepts;
            sumExchanges += exchanges;
            sumCouples += couples;
        }

        StageTotals totals = new StageTotals(
                sumRecs, sumAccepts, sumExchanges, sumCouples,
                safeDivide(sumAccepts, sumRecs),
                safeDivide(sumExchanges, sumAccepts),
                safeDivide(sumCouples, sumExchanges));

        String worst = computeWorstDropoffStage(totals);

        return new MatchingFunnelResponse(
                new Period(startDate, endDate, TZ),
                genderFilter != null ? genderFilter : "ALL",
                daily,
                totals,
                worst,
                new Meta(K_ANON_MIN, false, "live"));
    }

    // =========================================================================
    // §3.2 사용자 퍼널·코호트 (B-1.2)
    // =========================================================================

    public UserFunnelResponse getUserFunnel(LocalDate startDate,
                                            LocalDate endDate,
                                            String cohort) {
        LocalDate endExclusive = endDate.plusDays(1);
        String cohortMode = (cohort == null || cohort.isBlank()) ? "signup_date" : cohort;

        List<UserFunnelResponse.CohortRow> cohortRows = new ArrayList<>();
        long totalSignups = 0;
        long totalCouples = 0;
        Map<String, Double> stageRatesSum = new HashMap<>();
        int matureCohortCount = 0;

        if ("first_match_date".equalsIgnoreCase(cohortMode)) {
            List<Object[]> rows = userFunnelRepository.aggregateByFirstMatchWeek(startDate, endExclusive);
            for (Object[] row : rows) {
                LocalDate week = toLocalDate(row[0]);
                long stage3 = toLong(row[1]);
                long stage4 = toLong(row[2]);
                long stage5 = toLong(row[3]);

                // match 를 모수로 두고 match→exchange→couple 3단 퍼널
                UserFunnelResponse.Stages stages = new UserFunnelResponse.Stages(
                        new UserFunnelResponse.StageCount(0L, null),
                        new UserFunnelResponse.StageCount(0L, null),
                        new UserFunnelResponse.StageCount(stage3, 1.0),
                        new UserFunnelResponse.StageCount(stage4, safeDivide(stage4, stage3)),
                        new UserFunnelResponse.StageCount(stage5, safeDivide(stage5, stage3)));

                UserFunnelResponse.Dropoff dropoff = new UserFunnelResponse.Dropoff(
                        null, null,
                        dropoffRate(stage3, stage4),
                        dropoffRate(stage4, stage5));

                long maturityDays = java.time.temporal.ChronoUnit.DAYS
                        .between(week, LocalDate.now());
                String label = maturityLabel(maturityDays);
                if ("MATURE".equals(label)) matureCohortCount++;

                cohortRows.add(new UserFunnelResponse.CohortRow(
                        week, week.plusDays(6), maturityDays, label, stages, dropoff));

                totalSignups += stage3;
                totalCouples += stage5;
                accumulateRate(stageRatesSum, "matchToExchange",  dropoff.matchToExchange());
                accumulateRate(stageRatesSum, "exchangeToCouple", dropoff.exchangeToCouple());
            }
        } else {
            List<Object[]> rows = userFunnelRepository.aggregateBySignupWeek(
                    startDate, endExclusive, PROFILE_DONE_STEP);
            for (Object[] row : rows) {
                LocalDate week = toLocalDate(row[0]);
                long stage1 = toLong(row[1]);
                long stage2 = toLong(row[2]);
                long stage3 = toLong(row[3]);
                long stage4 = toLong(row[4]);
                long stage5 = toLong(row[5]);

                UserFunnelResponse.Stages stages = new UserFunnelResponse.Stages(
                        new UserFunnelResponse.StageCount(stage1, 1.0),
                        new UserFunnelResponse.StageCount(stage2, safeDivide(stage2, stage1)),
                        new UserFunnelResponse.StageCount(stage3, safeDivide(stage3, stage1)),
                        new UserFunnelResponse.StageCount(stage4, safeDivide(stage4, stage1)),
                        new UserFunnelResponse.StageCount(stage5, safeDivide(stage5, stage1)));

                UserFunnelResponse.Dropoff dropoff = new UserFunnelResponse.Dropoff(
                        dropoffRate(stage1, stage2),
                        dropoffRate(stage2, stage3),
                        dropoffRate(stage3, stage4),
                        dropoffRate(stage4, stage5));

                long maturityDays = java.time.temporal.ChronoUnit.DAYS
                        .between(week, LocalDate.now());
                String label = maturityLabel(maturityDays);
                if ("MATURE".equals(label)) matureCohortCount++;

                cohortRows.add(new UserFunnelResponse.CohortRow(
                        week, week.plusDays(6), maturityDays, label, stages, dropoff));

                totalSignups += stage1;
                totalCouples += stage5;
                accumulateRate(stageRatesSum, "signupToProfile",  dropoff.signupToProfile());
                accumulateRate(stageRatesSum, "profileToMatch",   dropoff.profileToMatch());
                accumulateRate(stageRatesSum, "matchToExchange",  dropoff.matchToExchange());
                accumulateRate(stageRatesSum, "exchangeToCouple", dropoff.exchangeToCouple());
            }
        }

        Double overallConversion = safeDivide(totalCouples, totalSignups);
        String worstStage = stageRatesSum.entrySet().stream()
                .min(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);

        UserFunnelResponse.Summary summary = new UserFunnelResponse.Summary(
                totalSignups, overallConversion, worstStage);

        boolean degraded = matureCohortCount == 0 && !cohortRows.isEmpty();

        return new UserFunnelResponse(
                new UserFunnelResponse.Period(startDate, endDate, TZ),
                cohortMode,
                cohortRows,
                summary,
                new UserFunnelResponse.Meta(K_ANON_MIN, degraded, "live"));
    }

    // =========================================================================
    // §3.3 키워드 TopN (B-1.3)
    // =========================================================================

    public KeywordTopResponse getKeywordTop(LocalDate startDate,
                                            LocalDate endDate,
                                            String tagType,
                                            int limit) {
        LocalDate endExclusive = endDate.plusDays(1);
        String tagFilter = (tagType == null || tagType.isBlank() || "ALL".equalsIgnoreCase(tagType))
                ? null : tagType.toUpperCase(Locale.ROOT);
        int safeLimit = Math.min(Math.max(limit, 1), 200);

        List<Object[]> rows = keywordRepository.topKeywords(
                startDate, endExclusive, tagFilter, K_ANON_MIN, safeLimit);

        List<KeywordTopResponse.KeywordItem> items = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            String type = (String) row[0];
            String keyword = (String) row[1];
            long freq = toLong(row[2]);
            long diaryFreq = toLong(row[3]);
            long userFreq = toLong(row[4]);
            BigDecimal avg = toBigDecimal(row[5]);
            BigDecimal p50 = toBigDecimal(row[6]);
            BigDecimal p90 = toBigDecimal(row[7]);
            int rank = (int) toLong(row[8]);

            items.add(new KeywordTopResponse.KeywordItem(
                    type, keyword, freq, diaryFreq, userFreq, avg, p50, p90, rank));
        }

        return new KeywordTopResponse(
                new KeywordTopResponse.Period(startDate, endDate, TZ),
                tagFilter,
                items,
                K_ANON_MIN,
                new KeywordTopResponse.Meta(false, "live"));
    }

    // =========================================================================
    // §3.4 세그먼트 Overview (B-1.4)
    // =========================================================================

    public SegmentOverviewResponse getSegmentOverview(LocalDate startDate,
                                                      LocalDate endDate,
                                                      String metric,
                                                      List<String> groupBy) {
        LocalDate endExclusive = endDate.plusDays(1);
        String metricUpper = (metric == null || metric.isBlank())
                ? "SIGNUP" : metric.toUpperCase(Locale.ROOT);
        List<String> groupByNormalized = (groupBy == null || groupBy.isEmpty())
                ? List.of("gender", "ageGroup") : groupBy;

        boolean byGender = groupByNormalized.contains("gender");
        boolean byAge    = groupByNormalized.contains("ageGroup");
        boolean byRegion = groupByNormalized.contains("regionCode");

        List<Object[]> rows = segmentRepository.aggregateSegments(
                startDate, endExclusive, metricUpper, byGender, byAge, byRegion);

        List<SegmentOverviewResponse.SegmentRow> segments = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            String g = (String) row[0];
            String a = (String) row[1];
            String r = (String) row[2];
            long users = toLong(row[3]);
            long num = toLong(row[4]);
            long den = toLong(row[5]);

            boolean masked = users < K_ANON_MIN;
            Double value = null;
            if (!masked) {
                value = switch (metricUpper) {
                    case "DIARY", "ACCEPT" -> safeDivide(num, den);
                    default -> (double) num;
                };
            }

            segments.add(new SegmentOverviewResponse.SegmentRow(
                    g, a, r, users, value, masked, masked ? "k<" + K_ANON_MIN : null));
        }

        return new SegmentOverviewResponse(
                new SegmentOverviewResponse.Period(startDate, endDate, TZ),
                metricUpper,
                groupByNormalized,
                segments,
                K_ANON_MIN,
                new SegmentOverviewResponse.Meta(false, "live"));
    }

    // =========================================================================
    // §3.5 여정 분포 (B-1.5) — Fallback 모드
    // =========================================================================

    public JourneyDurationResponse getJourneyDurations(LocalDate startDate,
                                                       LocalDate endDate) {
        LocalDate endExclusive = endDate.plusDays(1);
        List<Object[]> rows = journeyRepository.aggregateStageDurations(startDate, endExclusive);

        List<JourneyDurationResponse.StageStat> stats = new ArrayList<>(rows.size());
        for (Object[] row : rows) {
            String stage = (String) row[0];
            long n = toLong(row[1]);
            Double p50 = toDouble(row[2]);
            Double p90 = toDouble(row[3]);
            Double p99 = toDouble(row[4]);
            Double mean = toDouble(row[5]);
            Double stddev = toDouble(row[6]);

            stats.add(new JourneyDurationResponse.StageStat(stage, n, p50, p90, p99, mean, stddev));
        }

        return new JourneyDurationResponse(
                new JourneyDurationResponse.Period(startDate, endDate, TZ),
                stats,
                true,   // degraded — PROFILE_COMPLETED 이벤트 미적재로 updated_at 근사 사용 중
                true,   // fallbackUsed — user_activity_events 스트림 대신 원천 테이블 조인
                new JourneyDurationResponse.Meta("fallback-sql"));
    }

    // =========================================================================
    // §3.6 AI 성능 (B-1.6) — DB Fallback
    // =========================================================================

    public AiPerformanceResponse getAiPerformance(LocalDateTime startTs,
                                                  LocalDateTime endTs) {
        Object[] diaryRow = aiPerformanceRepository.aggregateDiaryAnalysis(startTs, endTs);
        long completed = toLong(diaryRow[0]);
        long failed = toLong(diaryRow[1]);
        long totalEvents = completed + failed;
        Double failRate = safeDivide(failed, totalEvents);

        Object[] lifestyleSummary = aiPerformanceRepository.aggregateLifestyleAnalysisSummary(startTs, endTs);
        long totalRuns = toLong(lifestyleSummary[0]);
        Double avgDiaryCount = toDouble(lifestyleSummary[1]);

        List<Object[]> dailyRows = aiPerformanceRepository.aggregateLifestyleDaily(startTs, endTs);
        List<AiPerformanceResponse.DailyBucket> dailyBuckets = new ArrayList<>(dailyRows.size());
        for (Object[] row : dailyRows) {
            dailyBuckets.add(new AiPerformanceResponse.DailyBucket(toLocalDate(row[0]), toLong(row[1])));
        }

        return new AiPerformanceResponse(
                new AiPerformanceResponse.Period(startTs, endTs, TZ),
                new AiPerformanceResponse.DiaryAnalysis(completed, failed, failRate, totalEvents),
                new AiPerformanceResponse.LifestyleAnalysis(totalRuns, avgDiaryCount, dailyBuckets),
                true,
                new AiPerformanceResponse.Meta(
                        "user_activity_events + lifestyle_analysis_log",
                        "P95 latency 등 심층 지표는 Prometheus 측 dashboard 참조"));
    }

    // =========================================================================
    // §3.7 매칭 통계 보조 (B-1.7)
    // =========================================================================

    public MatchingDiversityResponse getMatchingDiversity(LocalDate startDate,
                                                           LocalDate endDate) {
        LocalDateTime startTs = startDate.atStartOfDay();
        LocalDateTime endTs = endDate.plusDays(1).atStartOfDay();

        Object[] row = matchingDiversityRepository.aggregateDiversity(
                startTs, endTs, RERECOMMENDATION_WINDOW_DAYS);

        long totalRecs = toLong(row[0]);
        long uniqueCandidates = toLong(row[1]);
        Double shannon = toDouble(row[2]);
        long rerec = toLong(row[3]);
        Double rerecRate = safeDivide(rerec, totalRecs);

        return new MatchingDiversityResponse(
                new MatchingDiversityResponse.Period(startDate, endDate, TZ),
                totalRecs, uniqueCandidates, shannon, rerec, rerecRate,
                new MatchingDiversityResponse.Meta(RERECOMMENDATION_WINDOW_DAYS, "live"));
    }

    // =========================================================================
    // 내부 유틸
    // =========================================================================

    private String computeWorstDropoffStage(StageTotals t) {
        Map<String, Double> rates = Map.of(
                "ACCEPT",   nullToOne(t.acceptRate()),
                "EXCHANGE", nullToOne(t.exchangeRate()),
                "COUPLE",   nullToOne(t.coupleRate())
        );
        return rates.entrySet().stream()
                .min(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    private static Double dropoffRate(long from, long to) {
        if (from <= 0) return null;
        double retained = (double) to / (double) from;
        return 1.0 - retained;
    }

    private static void accumulateRate(Map<String, Double> acc, String key, Double value) {
        if (value == null) return;
        acc.merge(key, value, Double::sum);
    }

    private static String maturityLabel(long days) {
        if (days < 28)  return "WARMING_UP";
        if (days < 84)  return "PARTIAL";
        return "MATURE";
    }

    private static Double safeDivide(long numerator, long denominator) {
        if (denominator <= 0) return null;
        return (double) numerator / (double) denominator;
    }

    private static double nullToOne(Double v) {
        return v == null ? 1.0 : v;
    }

    private static long toLong(Object o) {
        if (o == null) return 0L;
        if (o instanceof Number n) return n.longValue();
        if (o instanceof BigDecimal b) return b.longValue();
        return Long.parseLong(o.toString());
    }

    private static Double toDouble(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.doubleValue();
        if (o instanceof BigDecimal b) return b.doubleValue();
        try { return Double.parseDouble(o.toString()); } catch (NumberFormatException e) { return null; }
    }

    private static BigDecimal toBigDecimal(Object o) {
        if (o == null) return null;
        if (o instanceof BigDecimal b) return b;
        if (o instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        try { return new BigDecimal(o.toString()); } catch (NumberFormatException e) { return null; }
    }

    private static LocalDate toLocalDate(Object o) {
        if (o == null) return null;
        if (o instanceof LocalDate ld) return ld;
        if (o instanceof Date d) return d.toLocalDate();
        return LocalDate.parse(o.toString());
    }
}
