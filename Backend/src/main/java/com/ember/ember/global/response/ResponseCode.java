package com.ember.ember.global.response;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ResponseCode {

    OK("S000", "성공");

    private final String code;
    private final String message;
}
