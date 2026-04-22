'use client';

// PII 접근 로그 페이지 — 관리자의 개인정보 접근 이력 감사 (Fail-Closed, SUPER_ADMIN 전용)

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import MockPageNotice from '@/components/common/MockPageNotice';
import DataTable from '@/components/common/DataTable';
import SearchBar from '@/components/common/SearchBar';
import Pagination from '@/components/common/Pagination';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { formatDateTime } from '@/lib/utils/format';
import type { DataTableColumn } from '@/components/common/DataTable';

type AccessType = 'EMAIL_VIEW' | 'REAL_NAME_VIEW' | 'PHONE_VIEW';

interface PiiAccessLog {
  id: number;
  accessedAt: string;
  adminEmail: string;
  accessType: AccessType;
  targetUserId: number;
  targetNickname: string;
  ipAddress: string;
}

const ACCESS_TYPE_LABELS: Record<AccessType, string> = {
  EMAIL_VIEW: '이메일 조회',
  REAL_NAME_VIEW: '실명 조회',
  PHONE_VIEW: '전화번호 조회',
};

const ACCESS_TYPE_COLORS: Record<AccessType, string> = {
  EMAIL_VIEW: 'bg-blue-50 text-blue-700 border-blue-200',
  REAL_NAME_VIEW: 'bg-orange-50 text-orange-700 border-orange-200',
  PHONE_VIEW: 'bg-red-50 text-red-700 border-red-200',
};

// Mock PII 접근 로그 8건
const MOCK_PII_LOGS: PiiAccessLog[] = [
  {
    id: 1,
    accessedAt: '2024-03-25T09:12:00',
    adminEmail: 'super@ember.kr',
    accessType: 'EMAIL_VIEW',
    targetUserId: 1042,
    targetNickname: '달빛산책',
    ipAddress: '192.168.1.10',
  },
  {
    id: 2,
    accessedAt: '2024-03-25T10:33:00',
    adminEmail: 'admin1@ember.kr',
    accessType: 'REAL_NAME_VIEW',
    targetUserId: 2087,
    targetNickname: '봄바람',
    ipAddress: '10.0.0.45',
  },
  {
    id: 3,
    accessedAt: '2024-03-25T11:05:00',
    adminEmail: 'super@ember.kr',
    accessType: 'PHONE_VIEW',
    targetUserId: 3319,
    targetNickname: '별헤는밤',
    ipAddress: '192.168.1.10',
  },
  {
    id: 4,
    accessedAt: '2024-03-24T14:20:00',
    adminEmail: 'admin2@ember.kr',
    accessType: 'EMAIL_VIEW',
    targetUserId: 876,
    targetNickname: '설레임',
    ipAddress: '10.0.0.52',
  },
  {
    id: 5,
    accessedAt: '2024-03-24T15:48:00',
    adminEmail: 'admin1@ember.kr',
    accessType: 'EMAIL_VIEW',
    targetUserId: 4521,
    targetNickname: '커피향',
    ipAddress: '10.0.0.45',
  },
  {
    id: 6,
    accessedAt: '2024-03-23T09:30:00',
    adminEmail: 'super@ember.kr',
    accessType: 'REAL_NAME_VIEW',
    targetUserId: 1234,
    targetNickname: '노을빛',
    ipAddress: '192.168.1.10',
  },
  {
    id: 7,
    accessedAt: '2024-03-22T16:10:00',
    adminEmail: 'admin2@ember.kr',
    accessType: 'PHONE_VIEW',
    targetUserId: 5678,
    targetNickname: '청명한하늘',
    ipAddress: '10.0.0.52',
  },
  {
    id: 8,
    accessedAt: '2024-03-21T11:55:00',
    adminEmail: 'admin1@ember.kr',
    accessType: 'REAL_NAME_VIEW',
    targetUserId: 987,
    targetNickname: '잔잔한물결',
    ipAddress: '10.0.0.45',
  },
];

const PAGE_SIZE = 5;

const columns: DataTableColumn<PiiAccessLog>[] = [
  {
    key: 'accessedAt',
    header: '접근 시각',
    cell: (row) => (
      <span className="text-sm">{formatDateTime(row.accessedAt)}</span>
    ),
  },
  {
    key: 'adminEmail',
    header: '관리자',
    cell: (row) => (
      <span className="text-sm font-medium">{row.adminEmail}</span>
    ),
  },
  {
    key: 'accessType',
    header: '접근 유형',
    cell: (row) => (
      <Badge
        variant="outline"
        className={`border text-xs ${ACCESS_TYPE_COLORS[row.accessType]}`}
      >
        {ACCESS_TYPE_LABELS[row.accessType]}
      </Badge>
    ),
  },
  {
    key: 'target',
    header: '대상 사용자',
    cell: (row) => (
      <span className="text-sm">
        <span className="font-medium">#{row.targetUserId}</span>{' '}
        <span className="text-muted-foreground">{row.targetNickname}</span>
      </span>
    ),
  },
  {
    key: 'ipAddress',
    header: 'IP 주소',
    cell: (row) => (
      <span className="font-mono-data text-sm text-muted-foreground">{row.ipAddress}</span>
    ),
  },
];

export default function PiiLogsPage() {
  const { hasPermission } = useAuthStore();
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0); // 0-based

  // SUPER_ADMIN 권한 가드
  if (!hasPermission('SUPER_ADMIN')) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">SUPER_ADMIN 권한이 필요합니다</p>
      </div>
    );
  }

  // 관리자 이메일 기준 검색
  const filtered = MOCK_PII_LOGS.filter(
    (log) => !keyword || log.adminEmail.includes(keyword),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    setPage(0);
  };

  return (
    <div>
      <PageHeader
        title="PII 접근 로그"
        description="관리자의 개인정보 접근 이력 (Fail-Closed 감사)"
      />

      <MockPageNotice message="백엔드 API 준비 중 — PII 접근 감사 로그" />

      {/* 검색 */}
      <div className="mb-4 max-w-sm">
        <SearchBar
          value={keyword}
          onChange={handleKeywordChange}
          placeholder="관리자 이메일 검색"
        />
      </div>

      {/* 데이터 테이블 */}
      <DataTable
        columns={columns}
        data={paged}
        rowKey={(row) => row.id}
        emptyState="접근 로그가 없습니다."
      />

      {/* 페이지네이션 */}
      <div className="mt-4">
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
