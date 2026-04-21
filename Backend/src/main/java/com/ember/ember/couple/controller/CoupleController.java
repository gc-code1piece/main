package com.ember.ember.couple.controller;

import com.ember.ember.couple.dto.CoupleAcceptResponse;
import com.ember.ember.couple.dto.CoupleRequestResponse;
import com.ember.ember.couple.service.CoupleService;
import com.ember.ember.global.response.ApiResponse;
import com.ember.ember.global.security.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * 커플 컨트롤러 (도메인 8)
 */
@RestController
@RequiredArgsConstructor
@Tag(name = "Couple", description = "커플 API")
public class CoupleController {

    private final CoupleService coupleService;

    /** 7.1 커플 요청 전송 */
    @PostMapping("/api/chat-rooms/{roomId}/couple-request")
    @Operation(summary = "커플 요청 전송", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<CoupleRequestResponse>> sendCoupleRequest(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long roomId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(
                coupleService.sendCoupleRequest(userDetails.getUserId(), roomId)));
    }

    /** 7.2 커플 요청 수락 */
    @PostMapping("/api/chat-rooms/{roomId}/couple-accept")
    @Operation(summary = "커플 요청 수락", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<CoupleAcceptResponse>> acceptCoupleRequest(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long roomId) {
        return ResponseEntity.ok(ApiResponse.success(
                coupleService.acceptCoupleRequest(userDetails.getUserId(), roomId)));
    }

    /** 7.3 커플 요청 거절 */
    @PostMapping("/api/chat-rooms/{roomId}/couple-reject")
    @Operation(summary = "커플 요청 거절", security = @SecurityRequirement(name = "bearerAuth"))
    public ResponseEntity<ApiResponse<Void>> rejectCoupleRequest(
            @AuthenticationPrincipal CustomUserDetails userDetails,
            @PathVariable Long roomId) {
        coupleService.rejectCoupleRequest(userDetails.getUserId(), roomId);
        return ResponseEntity.ok(ApiResponse.success());
    }
}
