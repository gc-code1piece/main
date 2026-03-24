package com.ember.ember.idealtype.domain;

import com.ember.ember.global.jpa.entity.BaseEntity;
import com.ember.ember.user.domain.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_vectors")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserVector extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "vector_data", nullable = false, columnDefinition = "TEXT")
    private String vectorData;

    @Column(name = "diary_count", nullable = false)
    private Integer diaryCount = 0;

    @Column(name = "last_updated_at", nullable = false)
    private LocalDateTime lastUpdatedAt;
}
