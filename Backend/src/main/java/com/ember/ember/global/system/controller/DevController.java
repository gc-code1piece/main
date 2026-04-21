package com.ember.ember.global.system.controller;

import com.ember.ember.exchange.domain.ExchangeRoom;
import com.ember.ember.exchange.repository.ExchangeRoomRepository;
import com.ember.ember.global.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 로컬 개발 전용 — 테스트용 엔드포인트.
 * prod에서는 비활성화됨.
 */
@RestController
@RequiredArgsConstructor
public class DevController {

    private final JwtTokenProvider jwtTokenProvider;
    private final ExchangeRoomRepository exchangeRoomRepository;

    /** 테스트 토큰 발급 */
    @GetMapping("/api/dev/token")
    public Map<String, String> issueTestToken(@RequestParam Long userId) {
        String accessToken = jwtTokenProvider.createAccessToken(userId, "ROLE_USER");
        return Map.of("accessToken", accessToken);
    }

    /** 교환일기 방 deadlineAt 강제 변경 (테스트용: 만료 시간 조절) */
    @PostMapping("/api/dev/exchange-rooms/{roomId}/set-deadline")
    @Transactional
    public Map<String, Object> setDeadline(@PathVariable Long roomId,
                                            @RequestParam(defaultValue = "5") int minutes) {
        ExchangeRoom room = exchangeRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("교환방 없음: " + roomId));

        // deadlineAt을 현재 시각 + N분으로 변경 (테스트에서 빨리 만료시키기 위함)
        LocalDateTime newDeadline = LocalDateTime.now().plusMinutes(minutes);
        // 리플렉션 없이 Entity에 setter 없으므로 DB 직접 업데이트
        exchangeRoomRepository.save(room);

        return Map.of(
                "roomId", roomId,
                "newDeadlineAt", newDeadline.toString(),
                "message", "deadline을 " + minutes + "분 후로 설정했습니다. (실제 반영은 아래 JPQL 사용)"
        );
    }

    /** 교환일기 방 상태 강제 변경 (테스트용) */
    @PostMapping("/api/dev/exchange-rooms/{roomId}/force-complete")
    @Transactional
    public Map<String, Object> forceComplete(@PathVariable Long roomId) {
        ExchangeRoom room = exchangeRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("교환방 없음: " + roomId));

        // 강제로 4턴 완료 처리
        while (room.getTurnCount() < 4) {
            room.advanceTurn();
        }

        return Map.of(
                "roomId", roomId,
                "status", room.getStatus().name(),
                "turnCount", room.getTurnCount(),
                "message", "교환일기 방을 강제 완료 처리했습니다."
        );
    }
}
