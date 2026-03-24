package com.ember.ember.global.response;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // 공통 (C)
    BAD_REQUEST("C001", HttpStatus.BAD_REQUEST, "잘못된 요청입니다."),
    DUPLICATE_RESOURCE("C002", HttpStatus.CONFLICT, "이미 존재하는 리소스입니다."),
    INTERNAL_ERROR("C003", HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다.");

    // 도메인별 에러코드는 API 명세서 확정 후 추가

    private final String code;
    private final HttpStatus status;
    private final String message;
}
