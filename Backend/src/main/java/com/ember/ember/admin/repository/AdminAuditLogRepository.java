package com.ember.ember.admin.repository;

import com.ember.ember.admin.domain.AdminAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 관리자 행위 감사 로그 저장소.
 * AOP({@code AdminAuditAspect})에서만 직접 호출하며,
 * 조회는 향후 감사 로그 조회 API 구현 시 메서드를 추가한다.
 */
public interface AdminAuditLogRepository extends JpaRepository<AdminAuditLog, Long> {
}
