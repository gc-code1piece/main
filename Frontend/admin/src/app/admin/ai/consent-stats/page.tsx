'use client';

// AI 동의 통계 페이지 — AI 분석·매칭 동의율 및 추세 모니터링 (VIEWER+ 접근 가능)

import PageHeader from '@/components/layout/PageHeader';
import MockPageNotice from '@/components/common/MockPageNotice';
import KpiCard from '@/components/common/KpiCard';
import DataTable from '@/components/common/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils/format';
import { Users, CheckCircle, Heart, UserMinus } from 'lucide-react';
import type { DataTableColumn } from '@/components/common/DataTable';

// Mock 통계 데이터
const MOCK_STATS = {
  totalUsers: 15234,
  analysisConsentRate: 0.873,
  matchingConsentRate: 0.812,
  revokedThisWeek: 47,
};

// 미동의 사용자 Mock 5건
interface MissingConsentUser {
  userId: number;
  nickname: string;
  lastLoginAt: string;
  missingConsents: string;
}

const MOCK_MISSING_USERS: MissingConsentUser[] = [
  {
    userId: 3842,
    nickname: '달빛산책',
    lastLoginAt: '2024-03-25T09:00:00',
    missingConsents: 'AI 분석, 매칭',
  },
  {
    userId: 7261,
    nickname: '봄바람',
    lastLoginAt: '2024-03-24T15:30:00',
    missingConsents: '매칭',
  },
  {
    userId: 1534,
    nickname: '별헤는밤',
    lastLoginAt: '2024-03-23T12:00:00',
    missingConsents: 'AI 분석',
  },
  {
    userId: 9087,
    nickname: '설레임',
    lastLoginAt: '2024-03-22T10:00:00',
    missingConsents: 'AI 분석, 매칭',
  },
  {
    userId: 4455,
    nickname: '커피향',
    lastLoginAt: '2024-03-20T08:00:00',
    missingConsents: '매칭',
  },
];

const missingUserColumns: DataTableColumn<MissingConsentUser>[] = [
  {
    key: 'userId',
    header: 'ID',
    cell: (row) => <span className="font-mono-data text-sm">#{row.userId}</span>,
  },
  {
    key: 'nickname',
    header: '닉네임',
    cell: (row) => <span className="text-sm font-medium">{row.nickname}</span>,
  },
  {
    key: 'lastLoginAt',
    header: '최근 접속',
    cell: (row) => (
      <span className="text-sm text-muted-foreground">{formatDateTime(row.lastLoginAt)}</span>
    ),
  },
  {
    key: 'missingConsents',
    header: '미동의 항목',
    cell: (row) => (
      <span className="text-sm text-destructive">{row.missingConsents}</span>
    ),
  },
];

export default function ConsentStatsPage() {
  return (
    <div>
      <PageHeader
        title="AI 동의 통계"
        description="AI 분석·매칭 동의율 및 추세"
      />

      <MockPageNotice />

      {/* KPI 카드 그리드 */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="전체 사용자"
          value={MOCK_STATS.totalUsers}
          icon={Users}
        />
        <KpiCard
          title="AI 분석 동의율"
          value={`${(MOCK_STATS.analysisConsentRate * 100).toFixed(1)}%`}
          icon={CheckCircle}
          trend={{ value: 2.1, isPositive: true }}
          valueClassName="text-success"
        />
        <KpiCard
          title="매칭 동의율"
          value={`${(MOCK_STATS.matchingConsentRate * 100).toFixed(1)}%`}
          icon={Heart}
          trend={{ value: 0.8, isPositive: true }}
          valueClassName="text-info"
        />
        <KpiCard
          title="이번 주 철회"
          value={MOCK_STATS.revokedThisWeek}
          icon={UserMinus}
          trend={{ value: 12, isPositive: false }}
          valueClassName="text-destructive"
        />
      </div>

      {/* 일별 추세 플레이스홀더 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>일별 추세 (최근 7일)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            차트 준비 중 (백엔드 연동 후 활성화)
          </p>
        </CardContent>
      </Card>

      {/* 미동의 사용자 리스트 */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>미동의 사용자 리스트</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={missingUserColumns}
            data={MOCK_MISSING_USERS}
            rowKey={(row) => row.userId}
            wrapInCard={false}
            emptyState="미동의 사용자가 없습니다."
          />
        </CardContent>
      </Card>
    </div>
  );
}
