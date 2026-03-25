package com.ember.ember.idealtype.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_personality_keywords")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserPersonalityKeyword extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "tag_type", nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private TagType tagType;

    @Column(nullable = false, length = 50)
    private String label;

    @Column(nullable = false, precision = 6, scale = 4)
    private BigDecimal weight;

    @Column(name = "analysis_status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private AnalysisStatus analysisStatus = AnalysisStatus.INSUFFICIENT_DATA;

    @Column(name = "analyzed_diary_count", nullable = false)
    private Integer analyzedDiaryCount = 0;

    @Column(name = "last_analyzed_at")
    private LocalDateTime lastAnalyzedAt;

    public enum TagType {
        EMOTION, LIFESTYLE, RELATIONSHIP_STYLE, TONE
    }

    public enum AnalysisStatus {
        INSUFFICIENT_DATA, COMPLETED
    }
}
