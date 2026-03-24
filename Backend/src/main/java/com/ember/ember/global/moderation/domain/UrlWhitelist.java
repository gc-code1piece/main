package com.ember.ember.global.moderation.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "url_whitelist")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UrlWhitelist extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 200)
    private String domain;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
}
