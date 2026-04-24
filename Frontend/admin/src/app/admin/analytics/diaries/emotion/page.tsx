'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import KpiCard from '@/components/common/KpiCard';
import MockPageNotice from '@/components/common/MockPageNotice';
import {
  Smile,
  Heart,
  Frown,
  Activity,
  RefreshCw,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
} from 'recharts';

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────
type Period = '7d' | '30d' | '90d';

interface EmotionDayPoint {
  date: string;
  joy: number;
  love: number;
  calm: number;
  sadness: number;
  anxiety: number;
  anger: number;
}

interface SentimentPoint {
  date: string;
  score: number; // -1 ~ +1 (긍정-부정)
}

interface SubTagItem {
  tag: string;
  count: number;
  category: 'positive' | 'negative';
}

interface WeekdayItem {
  day: string;
  joy: number;
  love: number;
  calm: number;
  sadness: number;
  anxiety: number;
  anger: number;
}

interface TimeSlotItem {
  slot: string;
  joy: number;
  love: number;
  calm: number;
  sadness: number;
  anxiety: number;
  anger: number;
}

// ─────────────────────────────────────────────
// 감정 6종 색상 및 레이블
// ─────────────────────────────────────────────
const EMOTION_COLORS: Record<string, string> = {
  joy:     '#10b981', // emerald
  love:    '#ec4899', // pink
  calm:    '#3b82f6', // blue
  sadness: '#6366f1', // indigo
  anxiety: '#f59e0b', // amber
  anger:   '#ef4444', // red
};

const EMOTION_LABELS: Record<string, string> = {
  joy:     '기쁨',
  love:    '사랑',
  calm:    '평온',
  sadness: '슬픔',
  anxiety: '불안',
  anger:   '분노',
};

const EMOTION_KEYS = ['joy', 'love', 'calm', 'sadness', 'anxiety', 'anger'] as const;

// ─────────────────────────────────────────────
// Mock 데이터: 30일 감정 비율 (합=100)
// ─────────────────────────────────────────────
const AREA_DATA: EmotionDayPoint[] = (() => {
  const result: EmotionDayPoint[] = [];
  const now = new Date('2026-04-24');
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    // 결정론적 의사난수로 기쁨 ~40% 지배 분포 생성
    const seed = (i * 17 + 11) % 29;
    const joy     = 36 + ((seed * 7) % 12);          // 36~48
    const love    = 14 + ((seed * 5 + 3) % 8);       // 14~22
    const calm    = 16 + ((seed * 3 + 7) % 8);       // 16~24
    const sadness = 8  + ((seed * 11 + 2) % 6);      // 8~14
    const anxiety = 7  + ((seed * 13 + 5) % 5);      // 7~12
    const rawSum  = joy + love + calm + sadness + anxiety;
    const anger   = 100 - rawSum;                     // 나머지
    result.push({
      date: `${m}/${day}`,
      joy,
      love,
      calm,
      sadness,
      anxiety,
      anger: Math.max(1, anger),
    });
  }
  return result;
})();

// ─────────────────────────────────────────────
// Mock 데이터: 긍정-부정 감정 변동성 30일
// ─────────────────────────────────────────────
const SENTIMENT_DATA: SentimentPoint[] = (() => {
  const result: SentimentPoint[] = [];
  const now = new Date('2026-04-24');
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const seed = (i * 13 + 7) % 31;
    // -0.2 ~ +0.6 범위
    const score = Math.round((-0.2 + ((seed * 8 + i * 2) % 80) / 100) * 100) / 100;
    result.push({ date: `${m}/${day}`, score: Math.min(0.6, Math.max(-0.2, score)) });
  }
  return result;
})();

// ─────────────────────────────────────────────
// Mock 데이터: 감정 6종 PieChart (전체 기간)
// ─────────────────────────────────────────────
const PIE_DATA = [
  { name: '기쁨',  value: 42.3, key: 'joy'     },
  { name: '사랑',  value: 17.8, key: 'love'    },
  { name: '평온',  value: 19.4, key: 'calm'    },
  { name: '슬픔',  value: 10.2, key: 'sadness' },
  { name: '불안',  value: 6.9,  key: 'anxiety' },
  { name: '분노',  value: 3.4,  key: 'anger'   },
];

// ─────────────────────────────────────────────
// Mock 데이터: 세분화 감정 태그 Top 20 BarChart
// ─────────────────────────────────────────────
const SUB_TAGS: SubTagItem[] = [
  { tag: '행복',   count: 1247, category: 'positive' },
  { tag: '감사',   count: 892,  category: 'positive' },
  { tag: '사랑',   count: 834,  category: 'positive' },
  { tag: '안정',   count: 718,  category: 'positive' },
  { tag: '설렘',   count: 612,  category: 'positive' },
  { tag: '희망',   count: 584,  category: 'positive' },
  { tag: '평화',   count: 523,  category: 'positive' },
  { tag: '만족',   count: 497,  category: 'positive' },
  { tag: '기쁨',   count: 463,  category: 'positive' },
  { tag: '감동',   count: 421,  category: 'positive' },
  { tag: '기대',   count: 389,  category: 'positive' },
  { tag: '자부심', count: 312,  category: 'positive' },
  { tag: '활력',   count: 287,  category: 'positive' },
  { tag: '그리움', count: 256,  category: 'positive' },
  { tag: '위로',   count: 234,  category: 'positive' },
  { tag: '걱정',   count: 198,  category: 'negative' },
  { tag: '후회',   count: 167,  category: 'negative' },
  { tag: '외로움', count: 143,  category: 'negative' },
  { tag: '불편',   count: 121,  category: 'negative' },
  { tag: '두려움', count: 98,   category: 'negative' },
];

// ─────────────────────────────────────────────
// Mock 데이터: 요일별 감정 분포 (주말 긍정 ↑, 월요일 부정 ↑)
// ─────────────────────────────────────────────
const WEEKDAY_DATA: WeekdayItem[] = [
  { day: '월', joy: 32, love: 14, calm: 15, sadness: 14, anxiety: 14, anger: 11 },
  { day: '화', joy: 37, love: 16, calm: 17, sadness: 12, anxiety: 11, anger: 7  },
  { day: '수', joy: 39, love: 17, calm: 18, sadness: 11, anxiety: 9,  anger: 6  },
  { day: '목', joy: 41, love: 18, calm: 19, sadness: 10, anxiety: 8,  anger: 4  },
  { day: '금', joy: 44, love: 19, calm: 17, sadness: 9,  anxiety: 7,  anger: 4  },
  { day: '토', joy: 49, love: 22, calm: 16, sadness: 7,  anxiety: 4,  anger: 2  },
  { day: '일', joy: 47, love: 21, calm: 17, sadness: 8,  anxiety: 5,  anger: 2  },
];

// ─────────────────────────────────────────────
// Mock 데이터: 시간대별 RadarChart (저녁 긍정 높음)
// ─────────────────────────────────────────────
const TIME_SLOT_DATA: TimeSlotItem[] = [
  { slot: '0~6시',   joy: 25, love: 12, calm: 20, sadness: 18, anxiety: 15, anger: 10 },
  { slot: '6~12시',  joy: 35, love: 16, calm: 22, sadness: 12, anxiety: 10, anger: 5  },
  { slot: '12~18시', joy: 40, love: 18, calm: 20, sadness: 10, anxiety: 8,  anger: 4  },
  { slot: '18~24시', joy: 48, love: 22, calm: 15, sadness: 8,  anxiety: 5,  anger: 2  },
];

// ─────────────────────────────────────────────
// KPI 계산
// ─────────────────────────────────────────────
// 기쁨 평균
const AVG_JOY = Math.round(AREA_DATA.reduce((s, d) => s + d.joy, 0) / AREA_DATA.length);
// 긍정 감정 비율 (기쁨+사랑+평온 평균)
const AVG_POSITIVE = Math.round(
  AREA_DATA.reduce((s, d) => s + d.joy + d.love + d.calm, 0) / AREA_DATA.length,
);
// 부정 감정 비율 (슬픔+불안+분노 평균)
const AVG_NEGATIVE = Math.round(
  AREA_DATA.reduce((s, d) => s + d.sadness + d.anxiety + d.anger, 0) / AREA_DATA.length,
);
// Shannon Entropy (전체 기간 평균 비율 기준)
const ENTROPY = (() => {
  const probs = PIE_DATA.map((d) => d.value / 100);
  return (-probs.reduce((s, p) => s + p * Math.log2(p), 0)).toFixed(2);
})();

// ─────────────────────────────────────────────
// 서브 컴포넌트: 커스텀 Tooltip 스타일
// ─────────────────────────────────────────────
const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 11,
};

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────
export default function DiaryEmotionPage() {
  const [period, setPeriod] = useState<Period>('30d');
  const [refreshing, setRefreshing] = useState(false);

  /** 새로고침 시뮬레이션 */
  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  /** CSV 다운로드 시뮬레이션 */
  const handleDownload = () => {
    const header = '날짜,기쁨,사랑,평온,슬픔,불안,분노';
    const rows = AREA_DATA.map(
      (d) => `${d.date},${d.joy},${d.love},${d.calm},${d.sadness},${d.anxiety},${d.anger}`,
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diary_emotion_${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* ── 헤더 ── */}
      <PageHeader
        title="일기 감정 추이"
        description="KcELECTRA 감정 태그 6종의 시계열 분포 분석"
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
        description="GET /api/v2.2/admin/analytics/diaries/emotion 연결 예정 (KcELECTRA emotion_tags 6종)"
      />

      {/* ── KPI 4개 ── */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <KpiCard
          title="지배적 감정"
          value={`기쁨 ${AVG_JOY}%`}
          description="전체 기간 최다 감정 카테고리"
          icon={Smile}
          trend={{ value: 2.1, isPositive: true, label: '전주 대비' }}
          valueClassName="text-[#10b981]"
        />
        <KpiCard
          title="긍정 감정 비율"
          value={`${AVG_POSITIVE}%`}
          description="기쁨 + 사랑 + 평온 합계 평균"
          icon={Heart}
          trend={{ value: 1.4, isPositive: true, label: '전주 대비' }}
          valueClassName="text-[#ec4899]"
        />
        <KpiCard
          title="부정 감정 비율"
          value={`${AVG_NEGATIVE}%`}
          description="슬픔 + 불안 + 분노 합계 평균"
          icon={Frown}
          trend={{ value: 1.4, isPositive: false, label: '전주 대비' }}
          valueClassName="text-[#6366f1]"
        />
        <KpiCard
          title="감정 다양성"
          value={`H = ${ENTROPY}`}
          description="Shannon 엔트로피 (최대 2.58)"
          icon={Activity}
          trend={{ value: 0.3, isPositive: true, label: '전주 대비' }}
        />
      </div>

      {/* ── 메인 차트: 30일 감정 추이 Stacked AreaChart ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">30일 감정 추이 — 100% Stacked Area</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            KcELECTRA emotion_tags 6종 비율 / 각 날짜 합계 = 100%
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart
              data={AREA_DATA}
              stackOffset="expand"
              margin={{ top: 8, right: 12, left: -8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 8 }}
                stroke="hsl(var(--muted-foreground))"
                interval={4}
              />
              <YAxis
                tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
                tick={{ fontSize: 9 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                formatter={(v: number, name: string) => [
                  `${(v * 100).toFixed(1)}%`,
                  EMOTION_LABELS[name] ?? name,
                ]}
                contentStyle={TOOLTIP_STYLE}
              />
              {EMOTION_KEYS.map((key) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId="1"
                  stroke={EMOTION_COLORS[key]}
                  fill={EMOTION_COLORS[key]}
                  fillOpacity={0.75}
                  strokeWidth={0}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>

          {/* 범례 */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {EMOTION_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-6 rounded"
                  style={{ backgroundColor: EMOTION_COLORS[key] }}
                />
                <span>{EMOTION_LABELS[key]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 보조 차트 2개: PieChart + LineChart ── */}
      <div className="mb-6 grid gap-6 md:grid-cols-2">

        {/* 감정 6종 PieChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">감정 카테고리 전체 분포</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              선택 기간 전체 emotion_tags 비율 합산
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={PIE_DATA}
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={40}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }: { name: string; value: number }) =>
                    `${name} ${value}%`
                  }
                  labelLine={false}
                  fontSize={10}
                >
                  {PIE_DATA.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={EMOTION_COLORS[entry.key]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, name: string) => [`${v}%`, name]}
                  contentStyle={TOOLTIP_STYLE}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 긍정-부정 변동성 LineChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">일별 감정 변동성 (긍정 − 부정 점수)</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              −1 ~ +1 범위 / 0 기준선 초과 = 긍정 지배
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart
                data={SENTIMENT_DATA}
                margin={{ top: 4, right: 12, left: -16, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 8 }}
                  stroke="hsl(var(--muted-foreground))"
                  interval={4}
                />
                <YAxis
                  domain={[-0.5, 0.8]}
                  tick={{ fontSize: 9 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <Tooltip
                  formatter={(v: number) => [v.toFixed(2), '감정 점수']}
                  contentStyle={TOOLTIP_STYLE}
                />
                {/* 0 기준선 */}
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="inline-block h-0.5 w-6 bg-emerald-500" />
              <span>긍정-부정 감정 점수 (0 이상 = 긍정 우세)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 세분화 감정 태그 Top 20 가로 BarChart ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">세분화 감정 태그 Top 20</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            KcELECTRA emotion_tags 하위 세분화 태그 빈도 순위 / 녹색: 긍정, 빨강: 부정
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={480}>
            <BarChart
              data={SUB_TAGS}
              layout="vertical"
              margin={{ top: 4, right: 40, left: 16, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 9 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                type="category"
                dataKey="tag"
                width={52}
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                formatter={(v: number) => [`${v.toLocaleString()}건`, '빈도']}
                contentStyle={TOOLTIP_STYLE}
              />
              <Bar
                dataKey="count"
                name="빈도"
                radius={[0, 4, 4, 0]}
              >
                {SUB_TAGS.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.category === 'positive' ? '#10b981' : '#ef4444'}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* 범례 */}
          <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-6 rounded" style={{ backgroundColor: '#10b981' }} />
              <span>긍정 감정 태그</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-6 rounded" style={{ backgroundColor: '#ef4444' }} />
              <span>부정 감정 태그</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── 요일별 감정 분포 Stacked BarChart ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">요일별 감정 분포</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            월~일 / 6개 감정 비율 stacked / 주말 긍정 ↑, 월요일 부정 ↑
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={WEEKDAY_DATA}
              margin={{ top: 8, right: 12, left: -8, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tick={{ fontSize: 9 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                formatter={(v: number, name: string) => [
                  `${v}%`,
                  EMOTION_LABELS[name] ?? name,
                ]}
                contentStyle={TOOLTIP_STYLE}
              />
              {EMOTION_KEYS.map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={key}
                  stackId="weekday"
                  fill={EMOTION_COLORS[key]}
                  fillOpacity={0.82}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>

          {/* 범례 */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {EMOTION_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-3 w-6 rounded"
                  style={{ backgroundColor: EMOTION_COLORS[key] }}
                />
                <span>{EMOTION_LABELS[key]}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── 시간대별 감정 RadarChart ── */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">시간대별 감정 분포 RadarChart</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            0~6시 / 6~12시 / 12~18시 / 18~24시 × 6개 감정 축 / 저녁 긍정 감정 높음
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={TIME_SLOT_DATA} cx="50%" cy="50%" outerRadius={110}>
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="slot"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 60]}
                tick={{ fontSize: 8 }}
                stroke="hsl(var(--border))"
              />
              <Tooltip
                formatter={(v: number, name: string) => [
                  `${v}%`,
                  EMOTION_LABELS[name] ?? name,
                ]}
                contentStyle={TOOLTIP_STYLE}
              />
              {EMOTION_KEYS.map((key) => (
                <Radar
                  key={key}
                  name={key}
                  dataKey={key}
                  stroke={EMOTION_COLORS[key]}
                  fill={EMOTION_COLORS[key]}
                  fillOpacity={0.12}
                  strokeWidth={1.5}
                />
              ))}
              <Legend
                formatter={(value: string) => EMOTION_LABELS[value] ?? value}
                iconSize={10}
                wrapperStyle={{ fontSize: 11 }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
