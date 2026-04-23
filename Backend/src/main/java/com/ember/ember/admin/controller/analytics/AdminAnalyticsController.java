package com.ember.ember.admin.controller.analytics;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.analytics.AiPerformanceResponse;
import com.ember.ember.admin.dto.analytics.JourneyDurationResponse;
import com.ember.ember.admin.dto.analytics.KeywordTopResponse;
import com.ember.ember.admin.dto.analytics.MatchingDiversityResponse;
import com.ember.ember.admin.dto.analytics.MatchingFunnelResponse;
import com.ember.ember.admin.dto.analytics.SegmentOverviewResponse;
import com.ember.ember.admin.dto.analytics.UserFunnelResponse;
import com.ember.ember.admin.service.analytics.AdminAnalyticsService;
import com.ember.ember.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 관리자 분석 API — 관리자 API 통합명세서 v2.1 §18.
 *
 * 구현 범위:
 *   - §18.1 매칭 퍼널 (getMatchingFunnel)          — B-1.1
 *   - §3.2 사용자 퍼널·코호트 (getUserFunnel)       — B-1.2
 *   - §3.3 키워드 TopN (getKeywordTop)              — B-1.3
 *   - §3.4 세그먼트 Overview (getSegmentOverview)   — B-1.4
 *   - §3.5 여정 소요시간 (getJourneyDurations)      — B-1.5
 *   - §3.6 AI 성능 (getAiPerformance)               — B-1.6
 *   - §3.7 매칭 다양성 (getMatchingDiversity)       — B-1.7
 *
 * 근거 문서:
 *   - docs/md/architecture/analytics/Ember_분석API_데이터설계서_v0.1.md §3.1~§3.2
 *   - docs/md/architecture/analytics/Ember_분석API_데이터설계서_v0.2.md §3.3~§3.7
 *   - 관리자 API 통합명세서 v2.1 §18 데이터 분석 API
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/analytics")
@Tag(name = "Admin Analytics", description = "관리자 분석 API (v2.1 §18)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminAnalyticsController {

    private final AdminAnalyticsService adminAnalyticsService;

    // ------------------------------------------------------------------------
    // §18.1 매칭 퍼널 — B-1.1
    // ------------------------------------------------------------------------
    @GetMapping("/matching/funnel")
    @Operation(summary = "매칭 퍼널 분석",
            description = "일별 매칭 요청→성사→교환일기→커플 5단 퍼널. gender=M|F|ALL 필터. 설계서 §3.1.")
    public ResponseEntity<ApiResponse<MatchingFunnelResponse>> getMatchingFunnel(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "ALL") String gender) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(29);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getMatchingFunnel(start, end, gender)));
    }

    // ------------------------------------------------------------------------
    // §3.2 사용자 퍼널·코호트 — B-1.2
    // ------------------------------------------------------------------------
    @GetMapping("/users/funnel")
    @Operation(summary = "사용자 퍼널·코호트 분석",
            description = "주 단위 코호트별 signup→profile→match→exchange→couple 5단 퍼널. "
                    + "cohort=signup_date(기본) | first_match_date. 설계서 §3.2.")
    public ResponseEntity<ApiResponse<UserFunnelResponse>> getUserFunnel(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "signup_date") String cohort) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(89);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getUserFunnel(start, end, cohort)));
    }

    // ------------------------------------------------------------------------
    // §3.3 키워드 TopN — B-1.3
    // ------------------------------------------------------------------------
    @GetMapping("/keywords/top")
    @Operation(summary = "키워드 TopN 분석",
            description = "기간 내 완료 일기의 태그 유형별 상위 키워드. "
                    + "tagType=EMOTION|LIFESTYLE|RELATIONSHIP_STYLE|TONE|ALL. k-anonymity 5 적용. 설계서 §3.3.")
    public ResponseEntity<ApiResponse<KeywordTopResponse>> getKeywordTop(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "ALL") String tagType,
            @RequestParam(required = false, defaultValue = "50") int limit) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(29);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getKeywordTop(start, end, tagType, limit)));
    }

    // ------------------------------------------------------------------------
    // §3.4 세그먼트 Overview — B-1.4
    // ------------------------------------------------------------------------
    @GetMapping("/segments/overview")
    @Operation(summary = "세그먼트 Overview",
            description = "성별×연령대×지역 세그먼트별 metric 집계. "
                    + "metric=SIGNUP(기본)|ACTIVE|DIARY|ACCEPT. groupBy=gender,ageGroup,regionCode. "
                    + "k-anonymity 5 미만은 masked. 설계서 §3.4.")
    public ResponseEntity<ApiResponse<SegmentOverviewResponse>> getSegmentOverview(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false, defaultValue = "SIGNUP") String metric,
            @RequestParam(required = false) List<String> groupBy) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(29);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getSegmentOverview(start, end, metric, groupBy)));
    }

    // ------------------------------------------------------------------------
    // §3.5 여정 소요시간 분포 — B-1.5 (Fallback)
    // ------------------------------------------------------------------------
    @GetMapping("/journeys/durations")
    @Operation(summary = "여정 단계별 소요시간 분포 (Fallback)",
            description = "signup→profile→match→exchange→couple 단계별 P50/P90/P99 시간(hour). "
                    + "user_activity_events 이벤트 미적재로 Fallback 쿼리 사용(X-Degraded). 설계서 §3.5.")
    public ResponseEntity<ApiResponse<JourneyDurationResponse>> getJourneyDurations(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(89);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getJourneyDurations(start, end)));
    }

    // ------------------------------------------------------------------------
    // §3.6 AI 성능 — B-1.6 (DB Fallback)
    // ------------------------------------------------------------------------
    @GetMapping("/ai/performance")
    @Operation(summary = "AI 성능 분석 (DB Fallback)",
            description = "일기 분석 성공/실패율 + 라이프스타일 분석 처리량. "
                    + "심층 Latency/큐 지표는 Prometheus 참조. 설계서 §3.6.")
    public ResponseEntity<ApiResponse<AiPerformanceResponse>> getAiPerformance(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTs,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTs) {

        LocalDateTime end = endTs != null ? endTs : LocalDateTime.now();
        LocalDateTime start = startTs != null ? startTs : end.minusHours(24);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getAiPerformance(start, end)));
    }

    // ------------------------------------------------------------------------
    // §3.7 매칭 다양성·재추천 — B-1.7
    // ------------------------------------------------------------------------
    @GetMapping("/matching/diversity")
    @Operation(summary = "매칭 추천 다양성·재추천 분석",
            description = "Shannon Entropy + 14일 이내 재추천 비율. 설계서 §3.7.")
    public ResponseEntity<ApiResponse<MatchingDiversityResponse>> getMatchingDiversity(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {

        LocalDate end = endDate != null ? endDate : LocalDate.now();
        LocalDate start = startDate != null ? startDate : end.minusDays(6);

        return ResponseEntity.ok(ApiResponse.success(
                adminAnalyticsService.getMatchingDiversity(start, end)));
    }
}
