'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import KpiCard from '@/components/common/KpiCard';
import MockPageNotice from '@/components/common/MockPageNotice';
import {
  BookOpen,
  Clock,
  Calendar,
  Moon,
  RefreshCw,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from 'recharts';

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────
type Period = '7d' | '30d' | '90d';

interface HeatmapCell {
  day: number;   // 0=월, 1=화, ... 6=일
  hour: number;  // 0~23
  count: number;
}

interface HourBarData {
  hour: string;
  count: number;
}

interface DayBarData {
  day: string;
  count: number;
}

interface DailyLineData {
  date: string;
  count: number;
}

interface TimeGroupRow {
  group: string;
  range: string;
  count: number;
  ratio: number;
  avgLength: number;
  avgQuality: number;
}

// ─────────────────────────────────────────────
// Mock 데이터 생성
// ─────────────────────────────────────────────
const DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

/**
 * 7×24 히트맵 Mock 데이터
 * 패턴: 저녁 18~23시 피크, 주말(토·일) 전반적으로 높음
 */
function generateHeatmapData(): HeatmapCell[] {
  const cells: HeatmapCell[] = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      // 기본 베이스 값
      let base = 5;

      // 저녁 피크 (18~23시)
      if (h >= 18 && h <= 22) base += 60 + (h - 18) * 8;
      else if (h === 23) base += 40;
      // 심야 (0~2시)
      else if (h >= 0 && h <= 2) base += 20;
      // 점심 (12~14시)
      else if (h >= 12 && h <= 13) base += 15;
      // 새벽 (3~6시) 매우 낮음
      else if (h >= 3 && h <= 6) base += 2;
      // 오전 (7~11시)
      else if (h >= 7 && h <= 11) base += 10;

      // 주말 가중치
      if (d === 5 || d === 6) base = Math.round(base * 1.4);
      // 월요일 감소
      if (d === 0) base = Math.round(base * 0.7);

      // 랜덤 노이즈 (결정론적: day+hour 기반)
      const noise = ((d * 7 + h * 3) % 15) - 7;
      const count = Math.max(0, Math.min(150, base + noise));

      cells.push({ day: d, hour: h, count });
    }
  }
  return cells;
}

const HEATMAP_DATA = generateHeatmapData();

/** 히트맵 셀 최댓값 (색 정규화용) */
const MAX_COUNT = Math.max(...HEATMAP_DATA.map((c) => c.count));

/** 5단계 파란 계열 색 스케일 */
const BLUE_SCALE = ['#eff6ff', '#dbeafe', '#93c5fd', '#3b82f6', '#1e3a8a'] as const;

/** 16진수 컬러 보간 */
function interpolateColor(hex1: string, hex2: string, t: number): string {
  const r1 = parseInt(hex1.slice(1, 3), 16);
  const g1 = parseInt(hex1.slice(3, 5), 16);
  const b1 = parseInt(hex1.slice(5, 7), 16);
  const r2 = parseInt(hex2.slice(1, 3), 16);
  const g2 = parseInt(hex2.slice(3, 5), 16);
  const b2 = parseInt(hex2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

/** 작성 수 → 배경색 계산 (5단계 그라데이션) */
function cellBgColor(count: number): string {
  if (count === 0) return BLUE_SCALE[0];
  const ratio = Math.min(count / MAX_COUNT, 1);
  const segment = 1 / 4; // 4개 구간 = 5단계
  const idx = Math.min(Math.floor(ratio / segment), 3);
  const t = (ratio - idx * segment) / segment;
  return interpolateColor(BLUE_SCALE[idx], BLUE_SCALE[idx + 1], t);
}

/** 배경이 어두울 때 흰 텍스트 */
function cellTextColor(count: number): string {
  return count >= MAX_COUNT * 0.55 ? '#ffffff' : '#374151';
}

/** 시간대별 BarChart 데이터 (24개) */
const HOUR_BAR_DATA: HourBarData[] = HOURS.map((h) => ({
  hour: `${String(h).padStart(2, '0')}시`,
  count: HEATMAP_DATA.filter((c) => c.hour === h).reduce((s, c) => s + c.count, 0),
}));

/** 요일별 BarChart 데이터 (7개) */
const DAY_BAR_DATA: DayBarData[] = DAYS.map((day, d) => ({
  day,
  count: HEATMAP_DATA.filter((c) => c.day === d).reduce((s, c) => s + c.count, 0),
}));

/** 최근 7일 LineChart 데이터 */
const DAILY_LINE_DATA: DailyLineData[] = [
  { date: '4/18', count: 712 },
  { date: '4/19', count: 834 },
  { date: '4/20', count: 756 },
  { date: '4/21', count: 891 },
  { date: '4/22', count: 978 },
  { date: '4/23', count: 1043 },
  { date: '4/24', count: 965 },
];

/** KPI 계산 */
const TOTAL_COUNT = HEATMAP_DATA.reduce((s, c) => s + c.count, 0);
const DAILY_AVG = Math.round(TOTAL_COUNT / 7);

const peakHourEntry = HOUR_BAR_DATA.reduce((a, b) => (a.count > b.count ? a : b));
const PEAK_HOUR = peakHourEntry.hour;

const peakDayEntry = DAY_BAR_DATA.reduce((a, b) => (a.count > b.count ? a : b));
const PEAK_DAY = peakDayEntry.day + '요일';

// 심야(0~5시) 작성 비율
const NIGHT_COUNT = HEATMAP_DATA
  .filter((c) => c.hour >= 0 && c.hour <= 5)
  .reduce((s, c) => s + c.count, 0);
const NIGHT_RATIO = Math.round((NIGHT_COUNT / TOTAL_COUNT) * 100);

/** 시간대 그룹 통계 테이블 */
const TIME_GROUP_TABLE: TimeGroupRow[] = [
  {
    group: '새벽',
    range: '0~6시',
    count: HEATMAP_DATA.filter((c) => c.hour >= 0 && c.hour <= 5).reduce((s, c) => s + c.count, 0),
    ratio: 0,
    avgLength: 312,
    avgQuality: 6.8,
  },
  {
    group: '오전',
    range: '6~12시',
    count: HEATMAP_DATA.filter((c) => c.hour >= 6 && c.hour <= 11).reduce((s, c) => s + c.count, 0),
    ratio: 0,
    avgLength: 387,
    avgQuality: 7.2,
  },
  {
    group: '오후',
    range: '12~18시',
    count: HEATMAP_DATA.filter((c) => c.hour >= 12 && c.hour <= 17).reduce((s, c) => s + c.count, 0),
    ratio: 0,
    avgLength: 421,
    avgQuality: 7.5,
  },
  {
    group: '저녁',
    range: '18~22시',
    count: HEATMAP_DATA.filter((c) => c.hour >= 18 && c.hour <= 21).reduce((s, c) => s + c.count, 0),
    ratio: 0,
    avgLength: 498,
    avgQuality: 8.1,
  },
  {
    group: '심야',
    range: '22~24시',
    count: HEATMAP_DATA.filter((c) => c.hour >= 22 && c.hour <= 23).reduce((s, c) => s + c.count, 0),
    ratio: 0,
    avgLength: 534,
    avgQuality: 8.4,
  },
];

// 비율 계산
const totalGroupCount = TIME_GROUP_TABLE.reduce((s, r) => s + r.count, 0);
TIME_GROUP_TABLE.forEach((row) => {
  row.ratio = Math.round((row.count / totalGroupCount) * 100);
});

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function DiaryHeatmapPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [tooltip, setTooltip] = useState<{ day: string; hour: number; count: number } | null>(null);

  /** 새로고침 시뮬레이션 */
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  /** CSV 다운로드 시뮬레이션 */
  const handleDownload = () => {
    const header = '요일,시간,작성 수';
    const rows = HEATMAP_DATA.map((c) => `${DAYS[c.day]},${c.hour}시,${c.count}`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diary_heatmap_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* ── 헤더 ── */}
      <PageHeader
        title="일기 시간 히트맵"
        description="요일·시간대별 일기 작성 패턴"
        actions={
          <>
            {/* 기간 토글 */}
            <div className="flex gap-1 rounded-md border border-border p-1">
              {(['7d', '30d', '90d'] as Period[]).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={period === p ? 'default' : 'ghost'}
                  className="h-7 px-3 text-xs"
                  onClick={() => setPeriod(p)}
                >
                  {p === '7d' ? '7일' : p === '30d' ? '30일' : '90일'}
                </Button>
              ))}
            </div>
            {/* 새로고침 */}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={refreshing ? 'mr-1.5 h-4 w-4 animate-spin' : 'mr-1.5 h-4 w-4'} />
              새로고침
            </Button>
            {/* 다운로드 */}
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1.5 h-4 w-4" />
              다운로드
            </Button>
          </>
        }
      />

      {/* ── Mock 안내 ── */}
      <MockPageNotice
        description="GET /api/v2.2/admin/analytics/diaries/heatmap 연결 예정 (diaries.created_at 요일×시간 집계)"
      />

      {/* ── KPI 4개 ── */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <KpiCard
          title="일일 평균 작성 수"
          value={DAILY_AVG.toLocaleString()}
          description="7일 기준 일 평균"
          icon={BookOpen}
          trend={{ value: 5.2, isPositive: true, label: '전주 대비' }}
          valueClassName="text-primary"
        />
        <KpiCard
          title="피크 시간대"
          value={PEAK_HOUR}
          description="가장 많이 작성되는 시간"
          icon={Clock}
          trend={{ value: 0, isPositive: true, label: '변동 없음' }}
        />
        <KpiCard
          title="피크 요일"
          value={PEAK_DAY}
          description="가장 많이 작성되는 요일"
          icon={Calendar}
          trend={{ value: 12.4, isPositive: true, label: '전주 대비' }}
          valueClassName="text-[#10b981]"
        />
        <KpiCard
          title="심야 작성 비율"
          value={`${NIGHT_RATIO}%`}
          description="0~6시 작성 비율"
          icon={Moon}
          trend={{ value: 1.3, isPositive: false, label: '전주 대비' }}
        />
      </div>

      {/* ── 메인 차트: 7×24 Heatmap ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">요일 × 시간대 작성 빈도 히트맵</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            행: 요일(월~일) / 열: 시간대(00~23시) / 색 강도: 작성 수 비례. 셀 hover 시 상세 정보 표시.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {/* 시간 헤더 */}
            <div
              className="grid"
              style={{ gridTemplateColumns: `36px repeat(24, minmax(28px, 1fr))` }}
            >
              {/* 빈 모서리 */}
              <div />
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="pb-1 text-center text-[10px] font-medium text-muted-foreground"
                >
                  {String(h).padStart(2, '0')}
                </div>
              ))}

              {/* 데이터 행 */}
              {DAYS.map((dayLabel, d) => (
                <>
                  {/* 요일 레이블 */}
                  <div
                    key={`label-${d}`}
                    className="flex items-center justify-center text-[11px] font-medium text-muted-foreground"
                  >
                    {dayLabel}
                  </div>
                  {HOURS.map((h) => {
                    const cell = HEATMAP_DATA.find((c) => c.day === d && c.hour === h);
                    const count = cell?.count ?? 0;
                    const bg = cellBgColor(count);
                    const fg = cellTextColor(count);
                    return (
                      <div
                        key={`${d}-${h}`}
                        className="relative m-0.5 flex cursor-default items-center justify-center rounded text-[9px] font-mono tabular-nums transition-opacity hover:opacity-80"
                        style={{
                          backgroundColor: bg,
                          color: fg,
                          height: '28px',
                          minWidth: '26px',
                        }}
                        onMouseEnter={() => setTooltip({ day: dayLabel, hour: h, count })}
                        onMouseLeave={() => setTooltip(null)}
                        title={`${dayLabel}요일 ${String(h).padStart(2, '0')}시 — ${count}건`}
                      >
                        {count > 0 ? count : ''}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>

          {/* tooltip 표시 영역 */}
          {tooltip && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs shadow-sm">
              <span className="font-medium text-foreground">{tooltip.day}요일</span>
              <span className="text-muted-foreground">{String(tooltip.hour).padStart(2, '0')}:00</span>
              <span className="text-primary font-bold">{tooltip.count}건</span>
            </div>
          )}

          {/* 범례 */}
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span>낮음</span>
            <div
              className="h-3 w-32 rounded"
              style={{
                background: 'linear-gradient(to right, #eff6ff, #dbeafe, #93c5fd, #3b82f6, #1e3a8a)',
              }}
            />
            <span>높음</span>
            <span className="ml-4 text-muted-foreground/60">최댓값: {MAX_COUNT}건</span>
          </div>
        </CardContent>
      </Card>

      {/* ── 보조 차트 2개: 시간대별 + 요일별 ── */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {/* 시간대별 BarChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">시간대별 작성 수</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              00~23시 전체 요일 합산
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={HOUR_BAR_DATA} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                  interval={2}
                />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  formatter={(v: number) => [`${v.toLocaleString()}건`, '작성 수']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="count" name="작성 수" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 요일별 BarChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">요일별 작성 수</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              월~일 전체 시간 합산
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={DAY_BAR_DATA} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  formatter={(v: number) => [`${v.toLocaleString()}건`, '작성 수']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="count" name="작성 수" fill="#1d4ed8" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── 최근 7일 LineChart ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">최근 7일 일별 작성 수 추이</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            최근 7일간 일 단위 일기 작성 건수
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={DAILY_LINE_DATA} margin={{ top: 4, right: 16, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                formatter={(v: number) => [`${v.toLocaleString()}건`, '작성 수']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                name="일별 작성 수"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── 시간대 그룹 통계 테이블 ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">시간대 그룹별 통계</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            새벽 / 오전 / 오후 / 저녁 / 심야 5개 그룹 — 작성 수·비율·평균 글자 수·품질 점수
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">시간대</TableHead>
                  <TableHead>범위</TableHead>
                  <TableHead className="text-right">작성 수</TableHead>
                  <TableHead className="text-right">비율</TableHead>
                  <TableHead className="text-right">평균 글자 수</TableHead>
                  <TableHead className="text-right pr-4">평균 품질 점수</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TIME_GROUP_TABLE.map((row) => (
                  <TableRow key={row.group}>
                    <TableCell className="pl-4 font-medium text-sm">{row.group}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.range}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-sm">
                      {row.count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${row.ratio * 1.6}px`,
                            backgroundColor: '#3b82f6',
                            opacity: 0.7,
                          }}
                        />
                        <span className="font-mono tabular-nums text-xs">{row.ratio}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-xs">
                      {row.avgLength}자
                    </TableCell>
                    <TableCell
                      className="text-right pr-4 font-mono tabular-nums text-xs font-bold"
                      style={{
                        color:
                          row.avgQuality >= 8.0
                            ? '#3b82f6'
                            : row.avgQuality >= 7.5
                              ? '#10b981'
                              : '#f59e0b',
                      }}
                    >
                      {row.avgQuality.toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
