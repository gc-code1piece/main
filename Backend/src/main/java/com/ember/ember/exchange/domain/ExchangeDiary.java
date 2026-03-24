package com.ember.ember.exchange.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "exchange_diaries")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ExchangeDiary extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id", nullable = false)
    private ExchangeRoom room;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "turn_number", nullable = false)
    private Integer turnNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_diary_id")
    private ExchangeDiary parentDiary;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private ExchangeDiaryStatus status = ExchangeDiaryStatus.DRAFT;

    @Column(length = 10)
    @Enumerated(EnumType.STRING)
    private Reaction reaction;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    public enum ExchangeDiaryStatus {
        DRAFT, SUBMITTED
    }

    public enum Reaction {
        HEART, SAD, HAPPY, FIRE
    }
}
