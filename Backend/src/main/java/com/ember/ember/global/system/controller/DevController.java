package com.ember.ember.global.system.controller;

import com.ember.ember.diary.domain.Diary;
import com.ember.ember.diary.repository.DiaryRepository;
import com.ember.ember.exchange.domain.ExchangeRoom;
import com.ember.ember.exchange.repository.ExchangeRoomRepository;
import com.ember.ember.global.security.jwt.JwtTokenProvider;
import com.ember.ember.messaging.event.AiAnalysisResultEvent;
import com.ember.ember.messaging.event.AiAnalysisResultType;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * 개발/테스트 전용 엔드포인트.
 * AI 시뮬레이션은 배포 서버에서도 사용 (FastAPI 미구현 동안).
 */
@RestController
@RequiredArgsConstructor
public class DevController {

    private final JwtTokenProvider jwtTokenProvider;
    private final ExchangeRoomRepository exchangeRoomRepository;
    private final DiaryRepository diaryRepository;
    private final RabbitTemplate rabbitTemplate;

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

    /** AI 분석 결과 시뮬레이션 (FastAPI 없이 파이프라인 테스트) */
    @PostMapping("/api/dev/ai/simulate/{diaryId}")
    public Map<String, Object> simulateAiResult(@PathVariable Long diaryId) {
        Diary diary = diaryRepository.findById(diaryId)
                .orElseThrow(() -> new RuntimeException("일기 없음: " + diaryId));

        Random random = new Random();
        // 설계서 4.2~4.4 기준 태그
        List<String> emotions = List.of("기쁨", "슬픔", "감사", "불안", "설렘", "분노", "평온", "외로움",
                "그리움", "희망", "자부심", "후회", "위로", "만족", "기대", "놀라움");
        List<String> lifestyles = List.of("활동적", "비활동적", "외향적", "내향적", "계획적", "즉흥적");
        List<String> tones = List.of("감성적", "이성적", "유머러스");
        List<String> relationships = List.of("적극적 소통", "소극적 소통", "애정표현 적극적",
                "대화형 갈등대응", "독립적", "의존적");

        List<AiAnalysisResultEvent.Tag> tags = List.of(
                new AiAnalysisResultEvent.Tag("EMOTION", emotions.get(random.nextInt(emotions.size())), 0.7 + random.nextDouble() * 0.3),
                new AiAnalysisResultEvent.Tag("LIFESTYLE", lifestyles.get(random.nextInt(lifestyles.size())), 0.6 + random.nextDouble() * 0.3),
                new AiAnalysisResultEvent.Tag("RELATIONSHIP_STYLE", relationships.get(random.nextInt(relationships.size())), 0.6 + random.nextDouble() * 0.3),
                new AiAnalysisResultEvent.Tag("TONE", tones.get(random.nextInt(tones.size())), 0.6 + random.nextDouble() * 0.3)
        );

        var result = new AiAnalysisResultEvent.Result(
                "AI 요약: 일상의 소소한 행복을 담은 따뜻한 일기입니다.",
                "DAILY",
                tags
        );

        var event = new AiAnalysisResultEvent(
                UUID.randomUUID().toString(), null, "v1",
                AiAnalysisResultType.DIARY_ANALYSIS_COMPLETED,
                diaryId, diary.getUser().getId(),
                null, null,
                ZonedDateTime.now(ZoneId.of("Asia/Seoul")).format(DateTimeFormatter.ISO_OFFSET_DATE_TIME),
                null, result, null, null, null, null
        );

        rabbitTemplate.convertAndSend("ai.exchange", "ai.result.v1", event);

        return Map.of(
                "diaryId", diaryId,
                "status", "SIMULATED",
                "message", "AI 분석 결과가 ai.result.q에 발행되었습니다. 2~3초 후 반영됩니다.",
                "tags", tags.stream().map(t -> t.type() + ":" + t.label()).toList()
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
