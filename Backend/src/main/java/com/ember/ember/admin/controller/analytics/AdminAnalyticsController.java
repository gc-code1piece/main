package com.ember.ember.admin.controller.analytics;

import com.ember.ember.admin.annotation.AdminOnly;
import com.ember.ember.admin.dto.analytics.MatchingFunnelResponse;
import com.ember.ember.admin.service.analytics.AdminAnalyticsService;
import com.ember.ember.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

/**
 * 관리자 분석 API — 관리자 API 통합명세서 v2.1 §18.
 *
 * Phase B-1 1차 구현 범위:
 *   - §18.1 매칭 퍼널 (getMatchingFunnel)
 *
 * 근거 문서: docs/md/architecture/analytics/Ember_분석API_데이터설계서_v0.1.md §3.1
 *           docs/md/architecture/analytics/Ember_분석API_데이터설계서_v0.2.md §4 (SQL 최적화 심화)
 *
 * 후속 PR (B-1.2~B-1.7):
 *   - §18.2 일기 패턴 / §18.3 이탈·리텐션 / §18.4 탈퇴 / §18.5 사용자 퍼널
 *   - 추가: 키워드 TopN / 세그먼트 / 여정 / AI 성능 / 매칭 보조
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/analytics")
@Tag(name = "Admin Analytics", description = "관리자 분석 API (v2.1 §18)")
@SecurityRequirement(name = "bearerAuth")
@AdminOnly
public class AdminAnalyticsController {

    private final AdminAnalyticsService adminAnalyticsService;

    /**
     * §18.1 매칭 퍼널 분석.
     *
     * 일별 recs → accepts → exchanges → couples 5단 퍼널 집계.
     * gender 필터 지원(M/F/ALL). 기본 period: 최근 30일.
     */
    @GetMapping("/matching/funnel")
    @Operation(summary = "매칭 퍼널 분석",
            description = "일별 매칭 요청→성사→교환일기→커플 5단 퍼널. gender=M|F|ALL 필터 지원. 설계서 §3.1 근거.")
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
}
