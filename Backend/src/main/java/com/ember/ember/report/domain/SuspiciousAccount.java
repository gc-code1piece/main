package com.ember.ember.report.domain;

import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "suspicious_accounts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SuspiciousAccount extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "suspicion_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private SuspicionType suspicionType;

    @Column(name = "risk_score", nullable = false, precision = 4, scale = 2)
    private BigDecimal riskScore = BigDecimal.ZERO;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private ReviewStatus status = ReviewStatus.PENDING;

    @Column(name = "detected_at", nullable = false)
    private LocalDateTime detectedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private AdminAccount reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_note", columnDefinition = "TEXT")
    private String reviewNote;

    public enum SuspicionType {
        BOT, FAKE_PROFILE, SPAM, MULTI_ACCOUNT, SCAM
    }

    public enum ReviewStatus {
        PENDING, INVESTIGATING, CONFIRMED, CLEARED
    }
}
