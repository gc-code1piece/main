'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import KpiCard from '@/components/common/KpiCard';
import MockPageNotice from '@/components/common/MockPageNotice';
import {
  Sparkles,
  Layers,
  BookOpen,
  Scale,
  RefreshCw,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────
type Period = '7d' | '30d' | '90d';

interface AssociationRule {
  antecedent: string;
  consequent: string;
  support: number;
  confidence: number;
  lift: number;
}

interface DiversityTrend {
  date: string;
  matching: number;
  keyword: number;
  topic: number;
  demographic: number;
}

interface DemographicBar {
  group: string;
  score: number;
}

interface RadarPoint {
  axis: string;
  thisWeek: number;
  lastWeek: number;
}

// ─────────────────────────────────────────────
// Mock 데이터
// ─────────────────────────────────────────────

/** 8개 키워드 */
const KEYWORDS = ['운동', '독서', '여행', '카페', '영화', '음악', '요리', '산책'] as const;
type Keyword = (typeof KEYWORDS)[number];

/** 8×8 동시 출현 매트릭스 (대각선=0, 대칭) */
const RAW_CO: Record<Keyword, Record<Keyword, number>> = {
  운동: { 운동: 0, 독서: 12, 여행: 34, 카페: 20, 영화: 9, 음악: 18, 요리: 8, 산책: 45 },
  독서: { 운동: 12, 독서: 0, 여행: 15, 카페: 28, 영화: 22, 음악: 31, 요리: 14, 산책: 10 },
  여행: { 운동: 34, 독서: 15, 여행: 0, 카페: 38, 영화: 27, 음악: 24, 요리: 19, 산책: 29 },
  카페: { 운동: 20, 독서: 28, 여행: 38, 카페: 0, 영화: 41, 음악: 36, 요리: 33, 산책: 17 },
  영화: { 운동: 9, 독서: 22, 여행: 27, 카페: 41, 영화: 0, 음악: 48, 요리: 16, 산책: 11 },
  음악: { 운동: 18, 독서: 31, 여행: 24, 카페: 36, 영화: 48, 음악: 0, 요리: 21, 산책: 14 },
  요리: { 운동: 8, 독서: 14, 여행: 19, 카페: 33, 영화: 16, 음악: 21, 요리: 0, 산책: 7 },
  산책: { 운동: 45, 독서: 10, 여행: 29, 카페: 17, 영화: 11, 음악: 14, 요리: 7, 산책: 0 },
};

/** 매트릭스 최댓값 (색 강도 정규화용) */
const MAX_CO = 48;

/** 동시 출현 빈도에 따른 배경색 계산 (0 → #eff6ff, MAX_CO → #1e3a8a) */
function heatColor(value: number, isDiagonal: boolean): string {
  if (isDiagonal) return '#f1f5f9'; // 대각선: 연한 회색
  if (value === 0) return '#eff6ff';
  const ratio = Math.min(value / MAX_CO, 1);
  // 파란 계열 그라데이션: #eff6ff → #bfdbfe → #3b82f6 → #1e3a8a
  if (ratio < 0.33) {
    const t = ratio / 0.33;
    return interpolateColor('#eff6ff', '#bfdbfe', t);
  } else if (ratio < 0.66) {
    const t = (ratio - 0.33) / 0.33;
    return interpolateColor('#bfdbfe', '#3b82f6', t);
  } else {
    const t = (ratio - 0.66) / 0.34;
    return interpolateColor('#3b82f6', '#1e3a8a', t);
  }
}

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

/** 밝은 배경일 때 텍스트 검은색, 어두운 배경일 때 흰색 */
function textColor(value: number, isDiagonal: boolean): string {
  if (isDiagonal || value < MAX_CO * 0.4) return '#374151';
  return '#ffffff';
}

/** 30일 다양성 추이 (4개 지표) */
const DIVERSITY_TREND: DiversityTrend[] = Array.from({ length: 30 }, (_, i) => {
  const day = new Date(2026, 3, i + 1);
  const label = `${day.getMonth() + 1}/${day.getDate()}`;
  return {
    date: label,
    matching: +(3.8 + Math.sin(i * 0.3) * 0.3 + i * 0.013).toFixed(2),
    keyword: +(0.61 + Math.cos(i * 0.25) * 0.04 + i * 0.001).toFixed(3),
    topic: +(0.72 + Math.sin(i * 0.2 + 1) * 0.05).toFixed(3),
    demographic: +(78 + Math.cos(i * 0.4) * 3 + i * 0.12).toFixed(1),
  };
});

/** 성별·연령 다양성 막대 */
const DEMOGRAPHIC_BARS: DemographicBar[] = [
  { group: '남 20대', score: 0.81 },
  { group: '여 20대', score: 0.79 },
  { group: '남 30대', score: 0.74 },
  { group: '여 30대', score: 0.77 },
  { group: '남 40대', score: 0.62 },
  { group: '여 40대', score: 0.58 },
];

/** 연관규칙 Top 10 */
const ASSOC_RULES: AssociationRule[] = [
  { antecedent: '운동', consequent: '산책', support: 0.85, confidence: 0.91, lift: 2.34 },
  { antecedent: '독서', consequent: '음악', support: 0.78, confidence: 0.83, lift: 2.10 },
  { antecedent: '카페', consequent: '영화', support: 0.72, confidence: 0.79, lift: 1.98 },
  { antecedent: '여행', consequent: '카페', support: 0.68, confidence: 0.75, lift: 1.87 },
  { antecedent: '음악', consequent: '영화', support: 0.65, confidence: 0.72, lift: 1.80 },
  { antecedent: '독서', consequent: '요리', support: 0.58, confidence: 0.66, lift: 1.72 },
  { antecedent: '산책', consequent: '운동', support: 0.55, confidence: 0.63, lift: 1.65 },
  { antecedent: '여행', consequent: '사진', support: 0.51, confidence: 0.59, lift: 1.58 },
  { antecedent: '요리', consequent: '카페', support: 0.48, confidence: 0.56, lift: 1.52 },
  { antecedent: '영화', consequent: '음악', support: 0.45, confidence: 0.53, lift: 1.47 },
];

/** RadarChart 6축 — 이번 주 vs 전주 비교 */
const RADAR_DATA: RadarPoint[] = [
  { axis: '키워드', thisWeek: 7.8, lastWeek: 7.2 },
  { axis: '주제', thisWeek: 8.1, lastWeek: 7.6 },
  { axis: '감정', thisWeek: 6.9, lastWeek: 6.5 },
  { axis: '성별', thisWeek: 7.5, lastWeek: 7.3 },
  { axis: '연령', thisWeek: 6.4, lastWeek: 6.1 },
  { axis: '지역', thisWeek: 5.8, lastWeek: 5.4 },
];

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function DiversityAnalyticsPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [refreshing, setRefreshing] = useState(false);

  // 기간 필터에 따른 추이 데이터 슬라이스
  const trendSlice =
    period === '7d'
      ? DIVERSITY_TREND.slice(-7)
      : period === '30d'
        ? DIVERSITY_TREND
        : DIVERSITY_TREND; // 90d: 실제 연결 시 별도 fetch

  /** 새로고침 시뮬레이션 */
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  /** 다운로드 시뮬레이션 */
  const handleDownload = () => {
    const csv = [
      ['날짜', '매칭 다양성', '키워드 다양성', '주제 다양성', '인구통계 균형'],
      ...DIVERSITY_TREND.map((r) => [r.date, r.matching, r.keyword, r.topic, r.demographic]),
    ]
      .map((row) => row.join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diversity_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* ── 헤더 ── */}
      <PageHeader
        title="다양성 지표"
        description="매칭·키워드·주제·사용자 풀의 다양성 종합 분석"
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
        description="GET /api/v2.2/admin/analytics/diversity 연결 예정 (Shannon Entropy + Apriori 연관규칙)"
      />

      {/* ── KPI 4개 ── */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <KpiCard
          title="매칭 다양성 점수"
          value="4.2"
          description="Shannon Entropy (0~5 정규화)"
          icon={Sparkles}
          trend={{ value: 3.1, isPositive: true, label: '전주 대비' }}
          valueClassName="text-primary"
        />
        <KpiCard
          title="키워드 조합 수"
          value={1_284}
          description="고유 페어 개수 (7일 누적)"
          icon={Layers}
          trend={{ value: 8.4, isPositive: true, label: '전주 대비' }}
        />
        <KpiCard
          title="주제 다양성 지수"
          value="0.814"
          description="Simpson Index (0~1)"
          icon={BookOpen}
          trend={{ value: 1.2, isPositive: true, label: '전주 대비' }}
          valueClassName="text-[#10b981]"
        />
        <KpiCard
          title="성별·연령 균형도"
          value="83%"
          description="인구통계 균형 점수"
          icon={Scale}
          trend={{ value: 2.0, isPositive: false, label: '전주 대비' }}
        />
      </div>

      {/* ── 메인 차트: 키워드 조합 빈도 Heatmap ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">키워드 동시 출현 빈도 Heatmap</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            8×8 매트릭스 — 두 키워드가 동일 사용자 일기에 함께 등장한 횟수. 색이 진할수록 빈도 높음.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {/* 헤더 행 */}
            <div
              className="grid"
              style={{ gridTemplateColumns: `80px repeat(${KEYWORDS.length}, 1fr)` }}
            >
              {/* 빈 모서리 */}
              <div />
              {KEYWORDS.map((col) => (
                <div
                  key={col}
                  className="py-1 text-center text-[11px] font-medium text-muted-foreground"
                >
                  {col}
                </div>
              ))}

              {/* 데이터 행 */}
              {KEYWORDS.map((row) => (
                <>
                  {/* 행 레이블 */}
                  <div
                    key={`label-${row}`}
                    className="flex items-center justify-end pr-2 text-[11px] font-medium text-muted-foreground"
                  >
                    {row}
                  </div>
                  {KEYWORDS.map((col) => {
                    const isDiag = row === col;
                    const val = RAW_CO[row][col];
                    const bg = heatColor(val, isDiag);
                    const fg = textColor(val, isDiag);
                    return (
                      <div
                        key={`${row}-${col}`}
                        className="m-0.5 flex items-center justify-center rounded text-[10px] font-mono tabular-nums"
                        style={{
                          backgroundColor: bg,
                          color: fg,
                          height: '40px',
                          minWidth: '36px',
                        }}
                        title={isDiag ? row : `${row} × ${col}: ${val}`}
                      >
                        {isDiag ? '—' : val}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>

          {/* 범례 */}
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <span>낮음</span>
            <div
              className="h-3 w-32 rounded"
              style={{
                background: 'linear-gradient(to right, #eff6ff, #bfdbfe, #3b82f6, #1e3a8a)',
              }}
            />
            <span>높음</span>
            <span className="ml-4 text-muted-foreground/60">대각선(—): 자기 자신</span>
          </div>
        </CardContent>
      </Card>

      {/* ── 보조 차트 2개 ── */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {/* 다양성 점수 추이 LineChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">다양성 점수 추이</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              최근 {period === '7d' ? '7' : '30'}일 · 4개 다양성 지표 라인
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendSlice} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                  interval={period === '7d' ? 0 : 4}
                />
                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="matching"
                  name="매칭 다양성"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="keyword"
                  name="키워드 다양성"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="topic"
                  name="주제 다양성"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="demographic"
                  name="인구통계 균형"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 성별·연령 다양성 BarChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">성별·연령 다양성 균형 지수</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              그룹별 Gini 기반 균형 점수 (0~1, 높을수록 균등)
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={DEMOGRAPHIC_BARS}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 1]}
                  tick={{ fontSize: 10 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis
                  dataKey="group"
                  type="category"
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  width={56}
                />
                <Tooltip
                  formatter={(v: number) => [v.toFixed(3), '균형 지수']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Bar
                  dataKey="score"
                  name="균형 지수"
                  radius={[0, 4, 4, 0]}
                  fill="#3b82f6"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── 연관규칙 Top 10 테이블 + RadarChart ── */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">
        {/* 연관규칙 Top 10 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">연관규칙 Top 10 (Apriori)</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Lift 내림차순 · Support ≥ 0.45
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">키워드 A → B</TableHead>
                    <TableHead className="text-right">Support</TableHead>
                    <TableHead className="text-right">Conf.</TableHead>
                    <TableHead className="text-right pr-4">Lift</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ASSOC_RULES.map((rule, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-4 text-sm font-medium">
                        <span className="text-foreground">{rule.antecedent}</span>
                        <span className="mx-1.5 text-muted-foreground">→</span>
                        <span className="text-primary">{rule.consequent}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs">
                        {(rule.support * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums text-xs">
                        {(rule.confidence * 100).toFixed(0)}%
                      </TableCell>
                      <TableCell
                        className="text-right pr-4 font-mono tabular-nums text-xs font-bold"
                        style={{ color: rule.lift >= 2 ? '#3b82f6' : rule.lift >= 1.7 ? '#10b981' : '#f59e0b' }}
                      >
                        {rule.lift.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 카테고리별 RadarChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">다양성 카테고리별 레이더</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              6축 다양성 점수 (0~10 정규화) — 이번 주 vs 전주
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={RADAR_DATA} margin={{ top: 8, right: 16, left: 16, bottom: 8 }}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fontSize: 12, fill: 'hsl(var(--foreground))' }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 10]}
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Radar
                  name="이번 주"
                  dataKey="thisWeek"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Radar
                  name="전주"
                  dataKey="lastWeek"
                  stroke="#f59e0b"
                  fill="#f59e0b"
                  fillOpacity={0.15}
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
