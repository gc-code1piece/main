'use client';

// 약관 변경 이력 페이지 — USER_TERMS / AI_TERMS 버전별 변경 이력 (SUPER_ADMIN 전용)

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

type TermType = 'USER_TERMS' | 'AI_TERMS';

interface TermsHistoryEntry {
  id: number;
  version: string;
  termType: TermType;
  changedBy: string;
  changedAt: string;
  summary: string;
}

const TERM_TYPE_LABELS: Record<TermType, string> = {
  USER_TERMS: '이용약관',
  AI_TERMS: 'AI 이용약관',
};

const TERM_TYPE_COLORS: Record<TermType, string> = {
  USER_TERMS: 'bg-blue-50 text-blue-700 border-blue-200',
  AI_TERMS: 'bg-purple-50 text-purple-700 border-purple-200',
};

// Mock 약관 변경 이력 6건
const MOCK_TERMS_HISTORY: TermsHistoryEntry[] = [
  {
    id: 1,
    version: 'v1.1',
    termType: 'USER_TERMS',
    changedBy: '김관리',
    changedAt: '2024-03-20T10:00:00',
    summary: '약관 5종 통합 및 개인정보 처리방침 분리 (v1.0 → v1.1)',
  },
  {
    id: 2,
    version: 'v1.0',
    termType: 'AI_TERMS',
    changedBy: '이운영',
    changedAt: '2024-03-15T14:30:00',
    summary: 'AI 분석·매칭 동의 전용 AI_TERMS 신규 제정',
  },
  {
    id: 3,
    version: 'v1.2',
    termType: 'USER_TERMS',
    changedBy: '김관리',
    changedAt: '2024-02-28T09:00:00',
    summary: '위치정보 수집 조항 삭제, 마케팅 수신 동의 선택 조항 추가',
  },
  {
    id: 4,
    version: 'v1.1',
    termType: 'AI_TERMS',
    changedBy: '박신입',
    changedAt: '2024-02-10T11:00:00',
    summary: 'KcELECTRA 모델 교체 관련 AI 분석 대상 데이터 범위 명시',
  },
  {
    id: 5,
    version: 'v1.0',
    termType: 'USER_TERMS',
    changedBy: '이운영',
    changedAt: '2024-01-05T09:00:00',
    summary: '서비스 최초 출시 — 이용약관 v1.0 제정',
  },
  {
    id: 6,
    version: 'v1.2',
    termType: 'AI_TERMS',
    changedBy: '김관리',
    changedAt: '2024-01-25T16:00:00',
    summary: '교환일기 리포트 생성 시 별도 동의 절차 추가 (opt-in 명문화)',
  },
];

const PAGE_SIZE = 5;

const columns: DataTableColumn<TermsHistoryEntry>[] = [
  {
    key: 'version',
    header: '버전',
    cell: (row) => (
      <span className="font-mono-data text-sm font-semibold">{row.version}</span>
    ),
  },
  {
    key: 'termType',
    header: '유형',
    cell: (row) => (
      <Badge
        variant="outline"
        className={`border text-xs ${TERM_TYPE_COLORS[row.termType]}`}
      >
        {TERM_TYPE_LABELS[row.termType]}
      </Badge>
    ),
  },
  {
    key: 'changedBy',
    header: '변경자',
    cell: (row) => <span className="text-sm">{row.changedBy}</span>,
  },
  {
    key: 'changedAt',
    header: '변경일',
    cell: (row) => (
      <span className="text-sm text-muted-foreground">{formatDateTime(row.changedAt)}</span>
    ),
  },
  {
    key: 'summary',
    header: '요약',
    cell: (row) => (
      <span className="text-sm text-muted-foreground">
        {row.summary.length > 60 ? `${row.summary.slice(0, 60)}…` : row.summary}
      </span>
    ),
  },
];

export default function TermsHistoryPage() {
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

  // 변경자 또는 요약 기준 검색
  const filtered = MOCK_TERMS_HISTORY.filter(
    (entry) =>
      !keyword ||
      entry.changedBy.includes(keyword) ||
      entry.summary.includes(keyword),
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
        title="약관 변경 이력"
        description="USER_TERMS / AI_TERMS 버전별 변경 이력"
      />

      <MockPageNotice />

      {/* 검색 */}
      <div className="mb-4 max-w-sm">
        <SearchBar
          value={keyword}
          onChange={handleKeywordChange}
          placeholder="변경자 또는 요약 검색"
        />
      </div>

      {/* 데이터 테이블 */}
      <DataTable
        columns={columns}
        data={paged}
        rowKey={(row) => row.id}
        emptyState="변경 이력이 없습니다."
      />

      {/* 페이지네이션 */}
      <div className="mt-4">
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
