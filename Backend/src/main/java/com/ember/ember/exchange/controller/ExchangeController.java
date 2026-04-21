package com.ember.ember.exchange.controller;

import com.ember.ember.exchange.dto.*;
import com.ember.ember.exchange.service.ExchangeService;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 교환일기 컨트롤러 (도메인 6)
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Exchange", description = "교환일기 API")
public class ExchangeController {

    private final ExchangeService exchangeService;

    /** 5.1 교환일기 방 목록 조회 */
    @GetMapping("/api/exchange-rooms")
    @Operation(summary = "교환일기 방 목록 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<ExchangeRoomListResponse>> getRooms(
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(ApiResponse.success(
                exchangeService.getRooms(userDetails.getUserId())));
    }

    /** 5.2 교환일기 방 상세 조회 */
    @GetMapping("/api/exchange-rooms/{roomId}")
    @Operation(summary = "교환일기 방 상세 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<ExchangeRoomDetailResponse>> getRoomDetail(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long roomId) {
        return ResponseEntity.ok(ApiResponse.success(
                exchangeService.getRoomDetail(userDetails.getUserId(), roomId)));
    }

    /** 5.3 교환일기 개별 열람 */
    @GetMapping("/api/exchange-rooms/{roomId}/diaries/{diaryId}")
    @Operation(summary = "교환일기 개별 열람 (읽음 처리)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<ExchangeDiaryDetailResponse>> readDiary(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long roomId,
            @PathVariable Long diaryId) {
        return ResponseEntity.ok(ApiResponse.success(
                exchangeService.readDiary(userDetails.getUserId(), roomId, diaryId)));
    }

    /** 5.4 교환일기 작성 */
    @PostMapping("/api/exchange-rooms/{roomId}/diaries")
    @Operation(summary = "교환일기 릴레이 작성 (턴 기반)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<ExchangeDiaryWriteResponse>> writeDiary(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long roomId,
            @Valid @RequestBody ExchangeDiaryRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                exchangeService.writeDiary(userDetails.getUserId(), roomId, request)));
    }

    /** 5.5 리액션 등록 */
    @PostMapping("/api/exchange-rooms/{roomId}/diaries/{diaryId}/reaction")
    @Operation(summary = "교환일기 감정 리액션 등록", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> addReaction(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long roomId,
            @PathVariable Long diaryId,
            @Valid @RequestBody ReactionRequest request) {
        exchangeService.addReaction(userDetails.getUserId(), roomId, diaryId, request);
        return ResponseEntity.ok(ApiResponse.success());
    }

    /** 5.6 공통점 리포트 조회 */
    @GetMapping("/api/exchange-rooms/{roomId}/report")
    @Operation(summary = "교환일기 공통점 리포트 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<ExchangeReportResponse>> getReport(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long roomId) {
        return ResponseEntity.ok(ApiResponse.success(
                exchangeService.getReport(userDetails.getUserId(), roomId)));
    }

    /** 5.7 관계 확장 선택 */
    @PostMapping("/api/exchange-rooms/{roomId}/next-step")
    @Operation(summary = "관계 확장 방향 선택 (CHAT/CONTINUE)", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<NextStepResponse>> chooseNextStep(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long roomId,
            @Valid @RequestBody NextStepRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                exchangeService.chooseNextStep(userDetails.getUserId(), roomId, request)));
    }

    /** 5.8 관계 확장 선택 상태 조회 */
    @GetMapping("/api/exchange-rooms/{roomId}/next-step/status")
    @Operation(summary = "관계 확장 선택 상태 조회", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<NextStepStatusResponse>> getNextStepStatus(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long roomId) {
        return ResponseEntity.ok(ApiResponse.success(
                exchangeService.getNextStepStatus(userDetails.getUserId(), roomId)));
    }
}
