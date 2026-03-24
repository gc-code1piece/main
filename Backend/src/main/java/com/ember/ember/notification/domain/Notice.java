package com.ember.ember.notification.domain;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "notices")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notice extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private NoticeCategory category;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private NoticeStatus status = NoticeStatus.DRAFT;

    @Column(nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    private NoticePriority priority = NoticePriority.NORMAL;

    @Column(name = "is_pinned", nullable = false)
    private Boolean isPinned = false;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "view_count", nullable = false)
    private Integer viewCount = 0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id", nullable = false)
    private AdminAccount admin;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    public enum NoticeCategory {
        GENERAL, MAINTENANCE, EVENT, UPDATE, TERMS
    }

    public enum NoticeStatus {
        DRAFT, PUBLISHED, SCHEDULED
    }

    public enum NoticePriority {
        HIGH, NORMAL
    }
}
