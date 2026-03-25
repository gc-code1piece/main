package com.ember.ember.user.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserSetting extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(length = 10)
    @Enumerated(EnumType.STRING)
    private Theme theme = Theme.SYSTEM;

    @Column(length = 5)
    private String language = "ko";

    @Column(name = "age_filter_range", nullable = false)
    private Integer ageFilterRange = 5;

    public enum Theme {
        LIGHT, DARK, SYSTEM
    }
}
