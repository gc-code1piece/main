package com.ember.ember.messaging.outbox.repository;

import com.ember.ember.messaging.outbox.entity.OutboxEvent;
import com.ember.ember.messaging.outbox.entity.OutboxEvent.OutboxStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 아웃박스 이벤트 Repository
 * OutboxRelay가 PENDING 이벤트를 배치 조회하여 RabbitMQ로 발행.
 */
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {

    /**
     * 다중 인스턴스 환경에서 중복 발행 방지를 위해 SKIP LOCKED 적용.
     * 한 인스턴스가 처리 중인 행은 다른 인스턴스가 건너뜀.
     *
     * @param status 조회할 상태 (PENDING)
     * @return 최대 100건의 이벤트 목록 (created_at 오름차순)
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(value = """
            SELECT e FROM OutboxEvent e
            WHERE e.status = :status
            ORDER BY e.createdAt ASC
            LIMIT 100
            """)
    List<OutboxEvent> findTop100ByStatusOrderByCreatedAt(@Param("status") OutboxStatus status);

    /**
     * 가장 오래된 PENDING 이벤트의 createdAt을 조회.
     * OutboxRelayLag 게이지에서 지연 시간 계산에 사용.
     *
     * @param status 조회할 상태 (PENDING)
     * @return 가장 오래된 PENDING 이벤트의 createdAt (없으면 Optional.empty())
     */
    @Query("SELECT MIN(e.createdAt) FROM OutboxEvent e WHERE e.status = :status")
    Optional<LocalDateTime> findOldestCreatedAtByStatus(@Param("status") OutboxStatus status);

    // ── AI 모니터링 대시보드용 쿼리 (Phase 3B §12) ───────────────────────────────

    /** 상태별 건수 집계 (PENDING / FAILED 등). */
    long countByStatus(OutboxStatus status);

    /** FAILED 이벤트 샘플 (최근 N건, 진단용). */
    @Query("""
            SELECT e FROM OutboxEvent e
            WHERE e.status = :status
            ORDER BY e.createdAt DESC
            """)
    List<OutboxEvent> findFailedSample(@Param("status") OutboxStatus status,
                                       org.springframework.data.domain.Pageable pageable);

    /** PENDING 이벤트의 FAILED 상태로 일괄 리셋 (재시도 트리거) — 영향 행 수 반환. */
    @org.springframework.data.jpa.repository.Modifying
    @Query("""
            UPDATE OutboxEvent e SET e.status = com.ember.ember.messaging.outbox.entity.OutboxEvent.OutboxStatus.PENDING,
                   e.retryCount = 0
            WHERE e.status = com.ember.ember.messaging.outbox.entity.OutboxEvent.OutboxStatus.FAILED
              AND (:eventIds IS NULL OR e.id IN :eventIds)
            """)
    int resetFailedToPending(@Param("eventIds") List<Long> eventIds);
}
