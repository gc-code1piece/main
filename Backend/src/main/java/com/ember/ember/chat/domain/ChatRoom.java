package com.ember.ember.chat.domain;

import com.ember.ember.exchange.domain.ExchangeRoom;
import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "chat_rooms")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatRoom extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_uuid", nullable = false, unique = true, updatable = false)
    private UUID roomUuid;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_a_id", nullable = false)
    private User userA;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_b_id", nullable = false)
    private User userB;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exchange_room_id", nullable = false)
    private ExchangeRoom exchangeRoom;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ChatRoomStatus status = ChatRoomStatus.ACTIVE;

    @Column(name = "user_a_left_at")
    private LocalDateTime userALeftAt;

    @Column(name = "user_b_left_at")
    private LocalDateTime userBLeftAt;

    @PrePersist
    private void generateUuid() {
        if (this.roomUuid == null) {
            this.roomUuid = UUID.randomUUID();
        }
    }

    public enum ChatRoomStatus {
        ACTIVE, COUPLE_CONFIRMED, CHAT_LEFT, TERMINATED
    }
}
