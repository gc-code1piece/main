package com.ember.ember.exchange.repository;

import com.ember.ember.exchange.domain.ExchangeRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * 교환일기 방 Repository
 */
public interface ExchangeRoomRepository extends JpaRepository<ExchangeRoom, Long> {

    /** roomUuid로 교환방 조회 */
    Optional<ExchangeRoom> findByRoomUuid(UUID roomUuid);

    /** 참여 중인 교환방 목록 (최신순) */
    @Query("SELECT r FROM ExchangeRoom r WHERE (r.userA.id = :userId OR r.userB.id = :userId) " +
           "AND r.status NOT IN ('TERMINATED', 'ENDED') ORDER BY r.modifiedAt DESC")
    List<ExchangeRoom> findByParticipant(@Param("userId") Long userId);

    /** 만료 대상 교환방 조회 (배치 스케줄러용, 5초 버퍼) */
    @Query("SELECT r FROM ExchangeRoom r WHERE r.status = 'ACTIVE' " +
           "AND r.deadlineAt < :cutoff")
    List<ExchangeRoom> findExpiredRooms(@Param("cutoff") java.time.LocalDateTime cutoff);
}
