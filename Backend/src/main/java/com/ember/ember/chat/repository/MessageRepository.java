package com.ember.ember.chat.repository;

import com.ember.ember.chat.domain.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * 메시지 Repository
 */
public interface MessageRepository extends JpaRepository<Message, Long> {

    /** 커서 기반 메시지 조회 (최신순) */
    @Query("SELECT m FROM Message m WHERE m.chatRoom.id = :roomId " +
           "AND (:before IS NULL OR m.sequenceId < :before) " +
           "ORDER BY m.sequenceId DESC")
    List<Message> findByCursor(@Param("roomId") Long roomId,
                               @Param("before") Long before,
                               org.springframework.data.domain.Pageable pageable);

    /** 안 읽은 메시지 수 */
    @Query("SELECT COUNT(m) FROM Message m WHERE m.chatRoom.id = :roomId " +
           "AND m.sender.id != :userId AND m.isRead = false")
    long countUnread(@Param("roomId") Long roomId, @Param("userId") Long userId);

    /** 마지막 메시지 */
    @Query("SELECT m FROM Message m WHERE m.chatRoom.id = :roomId ORDER BY m.sequenceId DESC")
    List<Message> findLastMessage(@Param("roomId") Long roomId, org.springframework.data.domain.Pageable pageable);

    /** 일괄 읽음 처리 */
    @Modifying
    @Query("UPDATE Message m SET m.isRead = true, m.readAt = CURRENT_TIMESTAMP " +
           "WHERE m.chatRoom.id = :roomId AND m.sender.id != :userId AND m.isRead = false")
    int markAllRead(@Param("roomId") Long roomId, @Param("userId") Long userId);
}
