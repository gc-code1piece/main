package com.ember.ember.diary.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 일기 작성 요청 */
public record DiaryCreateRequest(
        @NotBlank(message = "일기 내용은 필수입니다.")
        @Size(min = 200, max = 1000, message = "일기는 200~1,000자 사이여야 합니다.")
        String content,

        Long topicId
) {}
