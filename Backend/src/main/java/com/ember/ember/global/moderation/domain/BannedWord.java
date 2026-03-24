package com.ember.ember.global.moderation.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "banned_words")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BannedWord extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String word;

    @Column(nullable = false, length = 15)
    @Enumerated(EnumType.STRING)
    private BannedWordCategory category;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    public enum BannedWordCategory {
        PROFANITY, VIOLENCE, HARASSMENT, CONTACT
    }
}
