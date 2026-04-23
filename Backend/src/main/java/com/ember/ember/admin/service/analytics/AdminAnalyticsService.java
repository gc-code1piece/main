package com.ember.ember.admin.service.analytics;

import com.ember.ember.admin.dto.analytics.MatchingFunnelResponse;
import com.ember.ember.admin.dto.analytics.MatchingFunnelResponse.DailyFunnelPoint;
import com.ember.ember.admin.dto.analytics.MatchingFunnelResponse.Meta;
import com.ember.ember.admin.dto.analytics.MatchingFunnelResponse.Period;
import com.ember.ember.admin.dto.analytics.MatchingFunnelResponse.StageTotals;
import com.ember.ember.admin.repository.analytics.AnalyticsFunnelRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 관리자 분석 서비스 — 관리자 API v2.1 §18 / 설계서 §3 전반.
 *
 * 현재 구현 범위 (B-1 1차 PR):
 *   - §18.1 매칭 퍼널 (분석 API 7종 중 최우선)
 *
 * 후속 PR (B-1.2~B-1.7):
 *   - §18.2 일기 패턴 / §18.3 이탈·리텐션 / §18.4 탈퇴 / §18.5 사용자 퍼널
 *   - 키워드 TopN / 세그먼트 Overview / 여정 분포 / AI 성능 / 매칭 보조
 *
 * 설계 준수 사항:
 *   - 분모·분자 분리: totals 에만 비율 계산, daily 포인트는 raw count 만 반환.
 *   - Point-in-time: 생성 시점 기준(created_at/matched_at/confirmed_at) 그대로 사용.
 *   - Half-open interval: [startDate, endDateExclusive).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminAnalyticsService {

    private static final String TZ = "Asia/Seoul";
    private static final int K_ANON_MIN = 5;

    private final AnalyticsFunnelRepository funnelRepository;

    /**
     * §18.1 매칭 퍼널 일별 집계.
     *
     * @param startDate 시작 날짜 (포함, KST)
     * @param endDate 종료 날짜 (포함, KST) — 내부적으로 endDate+1 을 exclusive 로 변환
     * @param gender "M" | "F" | "ALL" | null
     */
    public MatchingFunnelResponse getMatchingFunnel(LocalDate startDate,
                                                    LocalDate endDate,
                                                    String gender) {
        LocalDate endExclusive = endDate.plusDays(1);
        String genderFilter = (gender == null || "ALL".equalsIgnoreCase(gender)) ? null : gender;

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

    /** 병목 단계 식별 — 단계별 전환율 중 최저값 반환. */
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

    private static LocalDate toLocalDate(Object o) {
        if (o == null) return null;
        if (o instanceof LocalDate ld) return ld;
        if (o instanceof Date d) return d.toLocalDate();
        return LocalDate.parse(o.toString());
    }
}
