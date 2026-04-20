package com.ember.ember.diary.repository;

import com.ember.ember.diary.domain.Diary;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface DiaryRepository extends JpaRepository<Diary, Long> {

    /** 특정 사용자의 당일 일기 조회 */
    Optional<Diary> findByUserIdAndDate(Long userId, LocalDate date);

    /** 특정 사용자의 당일 일기 존재 여부 */
    boolean existsByUserIdAndDate(Long userId, LocalDate date);

    /** 특정 사용자의 일기 목록 (최신순 페이징) */
    Page<Diary> findByUserIdOrderByDateDesc(Long userId, Pageable pageable);
}
