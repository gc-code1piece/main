package com.ember.ember.chat.repository;

import com.ember.ember.chat.domain.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * 채팅방 Repository
 */
public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    /** roomUuid로 조회 */
    Optional<ChatRoom> findByRoomUuid(UUID roomUuid);

    /** 교환방 ID로 조회 */
    Optional<ChatRoom> findByExchangeRoomId(Long exchangeRoomId);

    /** 참여 중인 채팅방 목록 (종료 제외) */
    @Query("SELECT cr FROM ChatRoom cr WHERE (cr.userA.id = :userId OR cr.userB.id = :userId) " +
           "AND cr.status NOT IN ('TERMINATED') ORDER BY cr.modifiedAt DESC")
    List<ChatRoom> findByParticipant(@Param("userId") Long userId);
}
