package com.ember.ember.diary.repository;

import com.ember.ember.diary.domain.DiaryKeyword;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DiaryKeywordRepository extends JpaRepository<DiaryKeyword, Long> {

    /** 특정 일기의 키워드 목록 */
    List<DiaryKeyword> findByDiaryId(Long diaryId);

    /** 특정 일기의 키워드 전체 삭제 */
    void deleteByDiaryId(Long diaryId);
}
