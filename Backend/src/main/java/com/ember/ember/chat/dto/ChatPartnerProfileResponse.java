package com.ember.ember.chat.dto;

import lombok.Builder;
import java.util.List;

/**
 * 채팅 상대방 프로필 응답
 */
@Builder
public record ChatPartnerProfileResponse(
        Long userId,
        String nickname,
        String realName,
        String birthDate,
        String gender,
        String sido,
        String sigungu,
        String school,
        List<String> personalityTags
) {}
