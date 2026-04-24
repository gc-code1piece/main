'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import KpiCard from '@/components/common/KpiCard';
import MockPageNotice from '@/components/common/MockPageNotice';
import {
  FileText,
  Star,
  CheckCircle,
  Award,
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
  ReferenceLine,
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  YAxis as YAxisRight,
} from 'recharts';

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────
type Period = '7d' | '30d' | '90d';

interface LengthBin {
  range: string;   // "0-50", "50-100" 등
  count: number;
  isBelowMin: boolean; // 100자 미만 여부 (강조 색 적용)
}

interface QualityBin {
  range: string;
  count: number;
}

interface ScatterPoint {
  length: number;       // 글자 수
  quality: number;      // 품질 점수 (0~100)
}

interface TrendPoint {
  date: string;
  avgLength: number;    // 평균 글자 수
  avgQuality: number;   // 평균 품질 점수
}

interface GradeRow {
  grade: string;        // S / A / B / C / D
  criteria: string;     // 기준 설명
  count: number;
  ratio: number;        // %
  avgLength: number;
  color: string;        // 배지 색
}

// ─────────────────────────────────────────────
// Mock 데이터
// ─────────────────────────────────────────────

/**
 * 글자 수 히스토그램 (10개 구간)
 * 전체 분포: 100자 미만 ≈ 12%, 100~300 ≈ 55%, 300~500 ≈ 25%, 500+ ≈ 8%
 * 최소 글자 수 기준: 100자 (명세서 4.1/4.3/4.5/4.6/6.2/14.1 공통 적용)
 */
const LENGTH_BINS: LengthBin[] = [
  { range: '0-50자',      count: 142,  isBelowMin: true  },
  { range: '50-100자',    count: 321,  isBelowMin: true  },
  { range: '100-150자',   count: 687,  isBelowMin: false },
  { range: '150-200자',   count: 892,  isBelowMin: false },
  { range: '200-300자',   count: 1243, isBelowMin: false },
  { range: '300-400자',   count: 934,  isBelowMin: false },
  { range: '400-500자',   count: 621,  isBelowMin: false },
  { range: '500-700자',   count: 387,  isBelowMin: false },
  { range: '700-1000자',  count: 196,  isBelowMin: false },
  { range: '1000자+',     count: 77,   isBelowMin: false },
];

/**
 * 품질 점수 분포 (0~100, 10점 구간)
 * 70~90 구간에 피크
 */
const QUALITY_BINS: QualityBin[] = [
  { range: '0-10',   count: 18  },
  { range: '10-20',  count: 34  },
  { range: '20-30',  count: 67  },
  { range: '30-40',  count: 124 },
  { range: '40-50',  count: 198 },
  { range: '50-60',  count: 312 },
  { range: '60-70',  count: 487 },
  { range: '70-80',  count: 721 },
  { range: '80-90',  count: 634 },
  { range: '90-100', count: 205 },
];

/**
 * 글자 수 vs 품질 점수 Scatter 데이터 (65개 포인트)
 * 글자 수↑ → 품질 점수↑ 상관관계 시각화
 */
const SCATTER_DATA: ScatterPoint[] = (() => {
  const points: ScatterPoint[] = [];
  // 결정론적 의사난수로 포인트 생성
  for (let i = 0; i < 65; i++) {
    const seed = (i * 37 + 13) % 97;
    const length = 50 + Math.floor((seed * 17 + i * 11) % 950);
    // 글자 수와 품질 점수 양의 상관관계 (r ≈ 0.55)
    const baseQuality = 30 + (length / 1000) * 55;
    const noise = ((seed * 7 + i * 3) % 30) - 15;
    const quality = Math.min(100, Math.max(0, Math.round(baseQuality + noise)));
    points.push({ length, quality });
  }
  return points;
})();

/**
 * 30일 추이 데이터
 * 글자 수 250~320자, 품질 75~82 등락
 */
const TREND_DATA: TrendPoint[] = (() => {
  const result: TrendPoint[] = [];
  const now = new Date('2026-04-24');
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const seed = (i * 13 + 7) % 31;
    const avgLength = 265 + Math.round(((seed * 11) % 55));        // 265~320
    const avgQuality = 75 + Math.round(((seed * 7 + i * 3) % 7));  // 75~82
    result.push({ date: `${month}/${day}`, avgLength, avgQuality });
  }
  return result;
})();

/**
 * 품질 등급 분포 테이블 (5개 등급)
 */
const GRADE_TABLE: GradeRow[] = [
  { grade: 'S', criteria: '95점 이상',   count: 127,  ratio: 2.4,  avgLength: 612, color: '#f59e0b' },
  { grade: 'A', criteria: '85~95점',     count: 534,  ratio: 10.1, avgLength: 487, color: '#10b981' },
  { grade: 'B', criteria: '70~85점',     count: 1821, ratio: 34.4, avgLength: 356, color: '#3b82f6' },
  { grade: 'C', criteria: '50~70점',     count: 1987, ratio: 37.5, avgLength: 248, color: '#8b5cf6' },
  { grade: 'D', criteria: '50점 미만',   count: 831,  ratio: 15.7, avgLength: 134, color: '#ef4444' },
];

// ─────────────────────────────────────────────
// KPI 계산
// ─────────────────────────────────────────────
const TOTAL_DIARIES = LENGTH_BINS.reduce((s, b) => s + b.count, 0);
const BELOW_MIN_COUNT = LENGTH_BINS.filter((b) => b.isBelowMin).reduce((s, b) => s + b.count, 0);
const ABOVE_MIN_RATIO = Math.round(((TOTAL_DIARIES - BELOW_MIN_COUNT) / TOTAL_DIARIES) * 100);

// 가중 평균 글자 수 계산 (구간 중간값 기준)
const MID_POINTS = [25, 75, 125, 175, 250, 350, 450, 600, 850, 1100];
const AVG_LENGTH = Math.round(
  LENGTH_BINS.reduce((s, b, i) => s + b.count * MID_POINTS[i], 0) / TOTAL_DIARIES,
);

// 가중 평균 품질 점수
const Q_MID_POINTS = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95];
const TOTAL_Q_DIARIES = QUALITY_BINS.reduce((s, b) => s + b.count, 0);
const AVG_QUALITY = (
  QUALITY_BINS.reduce((s, b, i) => s + b.count * Q_MID_POINTS[i], 0) / TOTAL_Q_DIARIES
).toFixed(1);

// AI 우수(90점+) 비율
const EXCELLENT_COUNT = QUALITY_BINS[9].count; // 90-100 구간
const EXCELLENT_RATIO = Math.round((EXCELLENT_COUNT / TOTAL_Q_DIARIES) * 100);

// ─────────────────────────────────────────────
// Recharts CustomBar: 100자 미만/이상 색 구분
// ─────────────────────────────────────────────
interface CustomBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  isBelowMin?: boolean;
}

function CustomLengthBar(props: CustomBarProps) {
  const { x = 0, y = 0, width = 0, height = 0, isBelowMin = false } = props;
  const fill = isBelowMin ? '#f59e0b' : '#3b82f6';
  return <rect x={x} y={y} width={width} height={height} fill={fill} rx={3} ry={3} />;
}

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function DiaryQualityPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [refreshing, setRefreshing] = useState(false);

  /** 새로고침 시뮬레이션 */
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  /** CSV 다운로드 시뮬레이션 */
  const handleDownload = () => {
    const header = '구간,일기 수,100자 미만';
    const rows = LENGTH_BINS.map(
      (b) => `${b.range},${b.count},${b.isBelowMin ? '예' : '아니오'}`,
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diary_quality_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* ── 헤더 ── */}
      <PageHeader
        title="일기 길이·품질 분석"
        description="글자 수 분포·AI 품질 점수·100자 기준 통과율"
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
        description="GET /api/v2.2/admin/analytics/diaries/quality 연결 예정 (character_count + ai_analysis_results)"
      />

      {/* ── KPI 4개 ── */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <KpiCard
          title="평균 글자 수"
          value={`${AVG_LENGTH}자`}
          description="전체 일기 가중 평균"
          icon={FileText}
          trend={{ value: 4.1, isPositive: true, label: '전주 대비' }}
          valueClassName="text-primary"
        />
        <KpiCard
          title="평균 품질 점수"
          value={`${AVG_QUALITY}점`}
          description="AI 분석 0~100점 기준"
          icon={Star}
          trend={{ value: 1.8, isPositive: true, label: '전주 대비' }}
          valueClassName="text-[#10b981]"
        />
        <KpiCard
          title="100자 이상 비율"
          value={`${ABOVE_MIN_RATIO}%`}
          description="최소 글자 수(100자) 충족률"
          icon={CheckCircle}
          trend={{ value: 0.9, isPositive: true, label: '전주 대비' }}
        />
        <KpiCard
          title="AI 우수(90점+) 비율"
          value={`${EXCELLENT_RATIO}%`}
          description="품질 점수 90점 이상 비율"
          icon={Award}
          trend={{ value: 0.5, isPositive: true, label: '전주 대비' }}
          valueClassName="text-[#f59e0b]"
        />
      </div>

      {/* ── 메인 차트: 글자 수 히스토그램 ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">글자 수 구간별 분포 히스토그램</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            10개 구간 / 노란 막대: 100자 미만(기준 미달) / 파란 막대: 100자 이상(기준 충족) / 빨간 점선: 최소 기준(100자)
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={LENGTH_BINS}
              margin={{ top: 12, right: 12, left: -8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="range"
                tick={{ fontSize: 9 }}
                stroke="hsl(var(--muted-foreground))"
                interval={0}
                angle={-30}
                textAnchor="end"
                height={48}
              />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                formatter={(v: number) => [`${v.toLocaleString()}건`, '일기 수']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              {/* 100자 기준선 — X축 2번째 구간("50-100자") 이후에 해당하므로 참조선 index 기반 표시 */}
              <ReferenceLine
                x="100-150자"
                stroke="#ef4444"
                strokeDasharray="4 3"
                label={{ value: '100자 기준', position: 'top', fontSize: 9, fill: '#ef4444' }}
              />
              <Bar
                dataKey="count"
                name="일기 수"
                shape={(props: CustomBarProps & { isBelowMin?: boolean }) => (
                  <CustomLengthBar {...props} />
                )}
              />
            </BarChart>
          </ResponsiveContainer>

          {/* 범례 */}
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-6 rounded" style={{ backgroundColor: '#f59e0b' }} />
              <span>100자 미만 (기준 미달)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-6 rounded" style={{ backgroundColor: '#3b82f6' }} />
              <span>100자 이상 (기준 충족)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-6 border-t-2 border-dashed border-red-500" />
              <span>최소 기준선</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 보조 차트 2개: 품질 분포 + Scatter ── */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">

        {/* 품질 점수 분포 BarChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">AI 품질 점수 분포</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              0~100점 10개 구간 / 70~90 구간에 피크
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={QUALITY_BINS}
                margin={{ top: 4, right: 8, left: -16, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  formatter={(v: number) => [`${v.toLocaleString()}건`, '일기 수']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                {/* 우수 기준선 (90점) */}
                <ReferenceLine
                  x="90-100"
                  stroke="#10b981"
                  strokeDasharray="4 3"
                  label={{ value: '우수', position: 'top', fontSize: 9, fill: '#10b981' }}
                />
                <Bar dataKey="count" name="일기 수" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 글자 수 vs 품질 점수 ScatterChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">글자 수 vs 품질 점수 상관관계</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              X축: 글자 수 / Y축: 품질 점수 / 상관관계 시각화 (r ≈ 0.55)
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <ScatterChart margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  dataKey="length"
                  name="글자 수"
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                  label={{ value: '글자 수', position: 'insideBottom', offset: -2, fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  type="number"
                  dataKey="quality"
                  name="품질 점수"
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                  domain={[0, 100]}
                  label={{ value: '품질', angle: -90, position: 'insideLeft', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    name === 'length' ? `${v}자` : `${v}점`,
                    name === 'length' ? '글자 수' : '품질 점수',
                  ]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                {/* 100자 최소 기준 수직선 */}
                <ReferenceLine
                  x={100}
                  stroke="#ef4444"
                  strokeDasharray="4 3"
                  label={{ value: '100자', position: 'top', fontSize: 8, fill: '#ef4444' }}
                />
                <Scatter
                  data={SCATTER_DATA}
                  fill="#3b82f6"
                  opacity={0.65}
                  r={4}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── 30일 품질/길이 추이 LineChart (Dual Y축) ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">최근 30일 품질·길이 추이</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            좌측 Y축: 평균 글자 수(파란 라인) / 우측 Y축: 평균 품질 점수(보라 라인)
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={TREND_DATA}
              margin={{ top: 4, right: 32, left: -8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 8 }}
                stroke="hsl(var(--muted-foreground))"
                interval={4}
              />
              {/* 좌측 Y축: 평균 글자 수 */}
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 9 }}
                stroke="#3b82f6"
                domain={[200, 350]}
                label={{ value: '글자 수', angle: -90, position: 'insideLeft', fontSize: 9, fill: '#3b82f6' }}
              />
              {/* 우측 Y축: 평균 품질 점수 */}
              <YAxisRight
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 9 }}
                stroke="#8b5cf6"
                domain={[60, 100]}
                label={{ value: '품질', angle: 90, position: 'insideRight', fontSize: 9, fill: '#8b5cf6' }}
              />
              <Tooltip
                formatter={(v: number, name: string) => [
                  name === 'avgLength' ? `${v}자` : `${v}점`,
                  name === 'avgLength' ? '평균 글자 수' : '평균 품질 점수',
                ]}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 11,
                }}
              />
              {/* 평균 글자 수 라인 (파란) */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="avgLength"
                name="avgLength"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
              {/* 평균 품질 점수 라인 (보라) */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgQuality"
                name="avgQuality"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* 범례 */}
          <div className="mt-2 flex items-center gap-5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-6 bg-blue-500" />
              <span>평균 글자 수 (좌)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-6 bg-violet-500" />
              <span>평균 품질 점수 (우)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 품질 등급 분포 테이블 ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">품질 등급별 분포</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            S(95점+) → D(50점 미만) 5개 등급 — 일기 수·비율·평균 글자 수
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4 w-16">등급</TableHead>
                  <TableHead>기준</TableHead>
                  <TableHead className="text-right">일기 수</TableHead>
                  <TableHead className="text-right">비율</TableHead>
                  <TableHead className="text-right pr-4">평균 글자 수</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {GRADE_TABLE.map((row) => (
                  <TableRow key={row.grade}>
                    <TableCell className="pl-4">
                      <span
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: row.color }}
                      >
                        {row.grade}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.criteria}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-sm">
                      {row.count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${Math.round(row.ratio * 2.4)}px`,
                            backgroundColor: row.color,
                            opacity: 0.7,
                          }}
                        />
                        <span className="font-mono tabular-nums text-xs">{row.ratio}%</span>
                      </div>
                    </TableCell>
                    <TableCell
                      className="text-right pr-4 font-mono tabular-nums text-sm font-medium"
                      style={{ color: row.color }}
                    >
                      {row.avgLength}자
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
