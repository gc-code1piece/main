package com.ember.ember.admin.repository;

import com.ember.ember.admin.domain.AdminPiiAccessLog;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * PII(개인식별정보) 접근 감사 로그 저장소.
 * AOP({@code PiiAccessAspect})에서만 직접 호출하며,
 * 조회는 향후 PII 접근 감사 조회 API 구현 시 메서드를 추가한다.
 */
public interface AdminPiiAccessLogRepository extends JpaRepository<AdminPiiAccessLog, Long> {
}
