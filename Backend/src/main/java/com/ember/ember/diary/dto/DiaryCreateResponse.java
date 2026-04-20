package com.ember.ember.diary.dto;

/** 일기 작성 응답 */
public record DiaryCreateResponse(
        Long diaryId,
        String content,
        String createdAt,
        String summary,
        String category
) {}
