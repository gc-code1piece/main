'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import KpiCard from '@/components/common/KpiCard';
import MockPageNotice from '@/components/common/MockPageNotice';
import {
  RefreshCw,
  Download,
  ArrowRight,
  Footprints,
  Clock,
  MapPin,
  CheckCircle,
  Users,
  BookOpen,
  Heart,
  MessageCircle,
  Sparkles,
  LogIn,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Legend,
  Cell,
} from 'recharts';

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────

type PeriodKey = '7d' | '30d' | '90d';

interface JourneyStage {
  name: string;
  icon: React.ReactNode;
  dwellMin: number;        // 평균 체류 시간 (분)
  conversionRate: number;  // 다음 단계 전환율 (%), 마지막 단계는 0
  color: string;
}

interface DailyAreaRow {
  date: string;
  가입: number;
  탐색: number;
  일기: number;
  매칭: number;
  교환: number;
  채팅: number;
}

interface CohortRow {
  cohort: string;
  D0: number;
  D1: number;
  D3: number;
  D7: number;
  D14: number;
  D30: number;
}

interface TransitionRow {
  from: string;
  가입: number;
  탐색: number;
  일기: number;
  매칭: number;
  교환: number;
  채팅: number;
  이탈: number;
}

// ─────────────────────────────────────────────
// Mock 데이터
// ─────────────────────────────────────────────

/** 6개 여정 단계 */
const JOURNEY_STAGES: JourneyStage[] = [
  { name: '가입',       icon: <LogIn className="h-5 w-5" />,         dwellMin: 5,  conversionRate: 75, color: '#3b82f6' },
  { name: '첫 일기',   icon: <BookOpen className="h-5 w-5" />,       dwellMin: 15, conversionRate: 70, color: '#60a5fa' },
  { name: '매칭 신청', icon: <Heart className="h-5 w-5" />,          dwellMin: 8,  conversionRate: 55, color: '#818cf8' },
  { name: '교환 시작', icon: <MessageCircle className="h-5 w-5" />,  dwellMin: 20, conversionRate: 60, color: '#a78bfa' },
  { name: '7턴 완주',  icon: <Sparkles className="h-5 w-5" />,       dwellMin: 35, conversionRate: 45, color: '#c4b5fd' },
  { name: '채팅 전환', icon: <Users className="h-5 w-5" />,          dwellMin: 12, conversionRate: 0,  color: '#ddd6fe' },
];

/** 단계별 체류 시간 BarChart 데이터 */
const DWELL_BAR_DATA = JOURNEY_STAGES.map((s) => ({
  stage: s.name,
  평균체류분: s.dwellMin,
  fill: s.color,
}));

/** 최근 7일 Stacked AreaChart 데이터 */
const AREA_DATA: DailyAreaRow[] = [
  { date: '04/18', 가입: 420, 탐색: 310, 일기: 280, 매칭: 190, 교환: 130, 채팅: 55 },
  { date: '04/19', 가입: 390, 탐색: 290, 일기: 260, 매칭: 175, 교환: 120, 채팅: 48 },
  { date: '04/20', 가입: 450, 탐색: 340, 일기: 300, 매칭: 210, 교환: 145, 채팅: 62 },
  { date: '04/21', 가입: 480, 탐색: 360, 일기: 320, 매칭: 225, 교환: 155, 채팅: 68 },
  { date: '04/22', 가입: 510, 탐색: 385, 일기: 345, 매칭: 240, 교환: 165, 채팅: 72 },
  { date: '04/23', 가입: 475, 탐색: 355, 일기: 315, 매칭: 220, 교환: 150, 채팅: 65 },
  { date: '04/24', 가입: 430, 탐색: 320, 일기: 285, 매칭: 200, 교환: 138, 채팅: 59 },
];

/** 코호트 리텐션 매트릭스 (4주 × D0/D1/D3/D7/D14/D30) */
const COHORT_DATA: CohortRow[] = [
  { cohort: '4월 1주', D0: 100, D1: 68, D3: 52, D7: 38, D14: 27, D30: 18 },
  { cohort: '4월 2주', D0: 100, D1: 71, D3: 55, D7: 41, D14: 29, D30: 19 },
  { cohort: '4월 3주', D0: 100, D1: 65, D3: 49, D7: 36, D14: 24, D30: 0  },
  { cohort: '4월 4주', D0: 100, D1: 73, D3: 57, D7: 0,  D14: 0,  D30: 0  },
];

/** 단계 전이 매트릭스 (행=from, 열=to) */
const TRANSITION_DATA: TransitionRow[] = [
  { from: '가입',       가입: 0,   탐색: 58,  일기: 17, 매칭: 0,  교환: 0,  채팅: 0,  이탈: 25 },
  { from: '탐색',       가입: 0,   탐색: 0,   일기: 62, 매칭: 8,  교환: 0,  채팅: 0,  이탈: 30 },
  { from: '일기',       가입: 0,   탐색: 5,   일기: 0,  매칭: 55, 교환: 0,  채팅: 0,  이탈: 40 },
  { from: '매칭',       가입: 0,   탐색: 0,   일기: 0,  매칭: 0,  교환: 60, 채팅: 0,  이탈: 40 },
  { from: '교환',       가입: 0,   탐색: 0,   일기: 5,  매칭: 0,  교환: 0,  채팅: 45, 이탈: 50 },
  { from: '채팅 전환',  가입: 0,   탐색: 0,   일기: 0,  매칭: 0,  교환: 0,  채팅: 90, 이탈: 10 },
];

const TRANSITION_COLS = ['가입', '탐색', '일기', '매칭', '교환', '채팅', '이탈'] as const;

// 코호트 셀 색상
function cohortCellClass(value: number): string {
  if (value === 0) return 'bg-muted text-muted-foreground';
  if (value >= 60) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
  if (value >= 40) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300';
  if (value >= 20) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
  return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
}

// 전이 매트릭스 셀 색상
function transitionCellClass(value: number, isItatl: boolean): string {
  if (value === 0) return 'text-muted-foreground';
  if (isItatl) return 'text-destructive font-semibold';
  if (value >= 60) return 'text-emerald-700 dark:text-emerald-300 font-semibold';
  if (value >= 40) return 'text-blue-700 dark:text-blue-300 font-semibold';
  return 'text-foreground';
}

// ─────────────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────────────

export default function JourneyAnalysisPage() {
  const [period, setPeriod] = useState<PeriodKey>('7d');

  const handleRefresh = () => {
    toast.success('사용자 여정 데이터를 새로고침했습니다.');
  };

  const handleExport = () => {
    toast.success('여정 분석 리포트를 다운로드합니다.');
  };

  // 기간 레이블
  const periodLabel: Record<PeriodKey, string> = { '7d': '7일', '30d': '30일', '90d': '90일' };

  // 가장 긴 체류 단계
  const longestDwellStage = JOURNEY_STAGES.reduce((a, b) => (a.dwellMin > b.dwellMin ? a : b));

  return (
    <div>
      {/* ── PageHeader ── */}
      <PageHeader
        title="사용자 여정 분석"
        description="이벤트 흐름 · 체류시간 · 코호트 리텐션 종합"
        actions={
          <div className="flex items-center gap-2">
            {/* 기간 토글 */}
            <div className="flex rounded-md border border-border overflow-hidden">
              {(['7d', '30d', '90d'] as PeriodKey[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-sm transition-colors duration-short ${
                    period === p
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'bg-background text-muted-foreground hover:bg-accent/40'
                  }`}
                >
                  {periodLabel[p]}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              새로고침
            </Button>
            <Button size="sm" onClick={handleExport}>
              <Download className="mr-1.5 h-4 w-4" />
              다운로드
            </Button>
          </div>
        }
      />

      {/* ── MockPageNotice ── */}
      <MockPageNotice
        description="GET /api/v2.2/admin/analytics/journey 연결 예정 (user_activity_events Star CTE)"
      />

      {/* ── KPI 카드 4개 ── */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <KpiCard
          title="평균 여정 단계 수"
          value="3.8"
          description={`기간: ${periodLabel[period]} 기준`}
          icon={Footprints}
        />
        <KpiCard
          title="평균 체류시간 (분)"
          value="15.8"
          description="전체 단계 평균"
          icon={Clock}
        />
        <KpiCard
          title="가장 긴 체류 단계"
          value={longestDwellStage.name}
          description={`평균 ${longestDwellStage.dwellMin}분 체류`}
          icon={MapPin}
        />
        <KpiCard
          title="일주일 완주율"
          value="45%"
          description="7턴 완주 → 채팅 전환"
          icon={CheckCircle}
          valueClassName="text-primary"
        />
      </div>

      {/* ── 메인 흐름 시각화 ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>여정 단계 흐름 (가입 → 채팅 전환)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-2 py-2 overflow-x-auto">
            {JOURNEY_STAGES.map((stage, idx) => (
              <div key={stage.name} className="flex items-center">
                {/* 단계 카드 */}
                <div
                  className="flex flex-col items-center rounded-xl p-4 min-w-[110px] shadow-sm border border-border/50"
                  style={{ background: `${stage.color}22` }}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full shadow-sm"
                    style={{ backgroundColor: `${stage.color}33` }}
                  >
                    <span style={{ color: stage.color }}>{stage.icon}</span>
                  </div>
                  <span className="mt-2 text-sm font-semibold text-foreground">{stage.name}</span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    체류 <strong className="text-foreground">{stage.dwellMin}분</strong>
                  </span>
                  {stage.conversionRate > 0 && (
                    <span
                      className={`mt-1 text-xs font-medium ${
                        stage.conversionRate >= 60
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : stage.conversionRate >= 45
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-red-500 dark:text-red-400'
                      }`}
                    >
                      → {stage.conversionRate}%
                    </span>
                  )}
                  {stage.conversionRate === 0 && (
                    <span className="mt-1 text-xs text-primary font-medium">최종 단계</span>
                  )}
                </div>
                {/* 화살표 */}
                {idx < JOURNEY_STAGES.length - 1 && (
                  <ArrowRight className="mx-1 h-5 w-5 flex-shrink-0 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            화살표 옆 % = 다음 단계 전환율 · 빨간색은 전환율 45% 미만 주의 구간
          </p>
        </CardContent>
      </Card>

      {/* ── 보조 차트 2개 ── */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {/* 단계별 체류시간 BarChart */}
        <Card>
          <CardHeader>
            <CardTitle>단계별 평균 체류시간 (분)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={DWELL_BAR_DATA} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="stage"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  unit="분"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [`${value}분`, '평균 체류']}
                />
                <Bar dataKey="평균체류분" radius={[4, 4, 0, 0]}>
                  {DWELL_BAR_DATA.map((entry) => (
                    <Cell key={entry.stage} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 여정 단계 분포 Stacked AreaChart */}
        <Card>
          <CardHeader>
            <CardTitle>단계별 일별 사용자 분포 (최근 7일)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={AREA_DATA} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="가입"   stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.7} />
                <Area type="monotone" dataKey="탐색"   stackId="1" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.7} />
                <Area type="monotone" dataKey="일기"   stackId="1" stroke="#818cf8" fill="#818cf8" fillOpacity={0.7} />
                <Area type="monotone" dataKey="매칭"   stackId="1" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.7} />
                <Area type="monotone" dataKey="교환"   stackId="1" stroke="#c4b5fd" fill="#c4b5fd" fillOpacity={0.7} />
                <Area type="monotone" dataKey="채팅"   stackId="1" stroke="#ddd6fe" fill="#ddd6fe" fillOpacity={0.9} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── 코호트 리텐션 매트릭스 ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>코호트 리텐션 매트릭스</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    가입 주차
                  </th>
                  {(['D0', 'D1', 'D3', 'D7', 'D14', 'D30'] as const).map((col) => (
                    <th
                      key={col}
                      className="py-2 px-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COHORT_DATA.map((row) => (
                  <tr key={row.cohort} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-4 text-sm font-medium text-foreground whitespace-nowrap">
                      {row.cohort}
                    </td>
                    {(['D0', 'D1', 'D3', 'D7', 'D14', 'D30'] as const).map((col) => {
                      const val = row[col];
                      return (
                        <td key={col} className="py-1.5 px-3 text-center">
                          {val > 0 ? (
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${cohortCellClass(val)}`}
                            >
                              {val}%
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded bg-emerald-200" />60%+ 우수
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded bg-blue-200" />40~59% 양호
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded bg-amber-200" />20~39% 주의
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded bg-red-200" />20% 미만 위험
            </span>
            <span className="ml-2 text-muted-foreground/70">— = 아직 해당 시점 미도래</span>
          </div>
        </CardContent>
      </Card>

      {/* ── 단계 전이 매트릭스 ── */}
      <Card>
        <CardHeader>
          <CardTitle>단계 전이 확률 매트릭스 (%)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 pr-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    From \\ To
                  </th>
                  {TRANSITION_COLS.map((col) => (
                    <th
                      key={col}
                      className={`py-2 px-3 text-center text-xs font-semibold uppercase tracking-wider ${
                        col === '이탈' ? 'text-destructive/70' : 'text-muted-foreground'
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TRANSITION_DATA.map((row) => (
                  <tr key={row.from} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-4 text-sm font-medium text-foreground whitespace-nowrap">
                      {row.from}
                    </td>
                    {TRANSITION_COLS.map((col) => {
                      const val = row[col as keyof TransitionRow] as number;
                      const isItatl = col === '이탈';
                      return (
                        <td
                          key={col}
                          className={`py-2 px-3 text-center text-xs ${transitionCellClass(val, isItatl)}`}
                        >
                          {val > 0 ? `${val}%` : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            행 합계는 100% 기준. 이탈(빨간색)은 앱을 벗어나거나 30일 이상 미접속 처리.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
