package com.ember.ember.diary.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "diary_drafts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DiaryDraft extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(length = 100)
    private String title;

    @Column(name = "saved_date", nullable = false)
    private LocalDate savedDate;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;
}
