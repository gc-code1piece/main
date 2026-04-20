package com.ember.ember.diary.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.topic.domain.WeeklyTopic;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "diaries",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "date"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Diary extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    private LocalDate date;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id")
    private WeeklyTopic topic;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private DiaryStatus status = DiaryStatus.SUBMITTED;

    @Column(length = 100)
    private String summary;

    @Column(length = 20)
    private String category;

    @Column(name = "is_exchanged", nullable = false)
    private Boolean isExchanged = false;

    public enum DiaryStatus {
        SUBMITTED, ANALYZING, ANALYZED, SKIPPED
    }

    /** 일기 생성 */
    @Builder
    public Diary(User user, String content, LocalDate date, WeeklyTopic topic) {
        this.user = user;
        this.content = content;
        this.date = date;
        this.topic = topic;
        this.status = DiaryStatus.SUBMITTED;
        this.isExchanged = false;
    }

    /** 일기 본문 수정 (당일만) */
    public void updateContent(String content) {
        this.content = content;
        this.summary = null;
        this.category = null;
        this.status = DiaryStatus.SUBMITTED;
    }

    /** 수정 가능 여부 (당일 KST + 교환 미시작) */
    public boolean isEditable() {
        return this.date.equals(LocalDate.now(java.time.ZoneId.of("Asia/Seoul"))) && !this.isExchanged;
    }
}
