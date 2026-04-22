'use client';

// AI 모니터링 메인 페이지 — v2.2 파이프라인 모니터링 위젯 5종 + 기존 AI 성능 지표

import Link from 'next/link';
import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import KpiCard from '@/components/common/KpiCard';
import { useAuthStore } from '@/stores/authStore';
import { monitoringApi } from '@/lib/api/monitoring';
import {
  useAiOverview,
  useReprocessDlq,
  useRetryOutbox,
  useForceFailDiary,
} from '@/hooks/useMonitoring';
import { Brain, Target, TrendingUp, Activity, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
} from 'recharts';

// Mock data for keyword distribution
const keywordData = [
  { category: '감정', positive: 45, negative: 12, neutral: 23 },
  { category: '라이프스타일', positive: 38, negative: 8, neutral: 34 },
  { category: '관계스타일', positive: 52, negative: 15, neutral: 18 },
  { category: '취미', positive: 67, negative: 5, neutral: 28 },
  { category: '가치관', positive: 41, negative: 19, neutral: 25 },
];

// Mock data for similarity distribution histogram
const similarityData = [
  { range: '0.0-0.2', count: 12 },
  { range: '0.2-0.4', count: 45 },
  { range: '0.4-0.6', count: 89 },
  { range: '0.6-0.8', count: 156 },
  { range: '0.8-1.0', count: 78 },
];

// Mock data for emotion radar
const emotionRadar = [
  { emotion: '기쁨', value: 85 },
  { emotion: '설렘', value: 72 },
  { emotion: '평온', value: 68 },
  { emotion: '그리움', value: 45 },
  { emotion: '외로움', value: 32 },
  { emotion: '불안', value: 18 },
];

// Mock data for AI model performance
const modelPerformanceData = [
  { name: 'KcELECTRA', value: 87.3, color: '#8b5cf6', description: '키워드 추출 정확도' },
  { name: 'KoSimCSE', value: 72.5, color: '#3b82f6', description: '매칭 성공률' },
];

// Gauge Chart Component
function GaugeChart({ value, color, label, description }: { value: number; color: string; label: string; description: string }) {
  const radius = 80;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI; // 반원
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={radius * 2} height={radius + 20} className="overflow-visible">
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - strokeWidth / 2} ${radius}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={`M ${strokeWidth / 2} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - strokeWidth / 2} ${radius}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
        />
        {/* Center text */}
        <text
          x={radius}
          y={radius - 10}
          textAnchor="middle"
          className="text-2xl font-bold"
          fill={color}
        >
          {value}%
        </text>
        <text
          x={radius}
          y={radius + 12}
          textAnchor="middle"
          className="text-xs"
          fill="#6b7280"
        >
          {label}
        </text>
      </svg>
      <p className="mt-2 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export default function AIMonitoringPage() {
  const { hasPermission } = useAuthStore();

  // 실 API 연동 — 30초 auto-refresh (Phase 3B)
  const { data: overview } = useAiOverview();
  const reprocessDlq = useReprocessDlq();
  const retryOutbox = useRetryOutbox();
  const forceFailDiary = useForceFailDiary();

  // ─── v2.2 파이프라인 버튼 핸들러 ───────────────────────────

  // DLQ 재처리 (SUPER_ADMIN 전용)
  const handleDlqReprocess = () => {
    reprocessDlq.mutate('diary-analyze.dlq', {
      onSuccess: (res) => {
        const processed = res.data.data?.processedCount ?? 0;
        toast.success(`DLQ 재처리 완료: ${processed}건`);
      },
      onError: () => toast.error('DLQ 재처리 요청에 실패했습니다'),
    });
  };

  // Outbox 재시도 (SUPER_ADMIN 전용)
  const handleOutboxRetry = () => {
    retryOutbox.mutate(undefined, {
      onSuccess: (res) => {
        const retried = res.data.data?.retriedCount ?? 0;
        toast.success(`Outbox 재시도 완료: ${retried}건`);
      },
      onError: () => toast.error('Outbox 재시도 요청에 실패했습니다'),
    });
  };

  // 일기 분석 강제 FAILED 전이 (SUPER_ADMIN 전용)
  const handleForceFailDiary = () => {
    const diaryId = Number(window.prompt('강제 FAILED 전이할 diaryId를 입력하세요'));
    if (!diaryId) return;
    const reason = window.prompt('사유를 입력하세요 (예: STUCK_TIMEOUT)') || 'STUCK_TIMEOUT';
    forceFailDiary.mutate(
      { diaryId, reason },
      {
        onSuccess: () => toast.success('강제 FAILED 전이 완료'),
        onError: () => toast.error('강제 FAILED 전이 실패'),
      },
    );
  };

  // 포맷 헬퍼
  const fmtPercent = (v?: number) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : '—');
  const fmtNum = (v?: number) => (typeof v === 'number' ? v.toLocaleString() : '—');

  return (
    <div>
      <PageHeader
        title="AI 모니터링"
        description="KcELECTRA 키워드 분석 및 KoSimCSE 매칭 성능 모니터링"
      />

      {/* ─── v2.2 AI 파이프라인 모니터링 섹션 (신규) ─── */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">AI 파이프라인 모니터링</h2>
            <p className="text-sm text-muted-foreground">
              5개 위젯으로 AI 파이프라인 건강도 실시간 추적
            </p>
          </div>
          <Badge variant="outline">v2.2 신규</Badge>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* 위젯 1: AI 동의 통계 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">AI 동의 통계</CardTitle>
              <Link
                href="/admin/ai/consent-stats"
                className="text-xs text-primary underline-offset-2 hover:underline"
              >
                자세히
              </Link>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-bold">{fmtPercent(overview?.consentRate)}</div>
              <p className="text-xs text-muted-foreground">AI 분석 동의율</p>
              <p className="text-xs text-muted-foreground">
                30초마다 자동 갱신
              </p>
            </CardContent>
          </Card>

          {/* 위젯 2: MQ/DLQ 모니터링 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MQ/DLQ 모니터링</CardTitle>
              {hasPermission('SUPER_ADMIN') && (
                <Button size="sm" variant="outline" onClick={handleDlqReprocess}>
                  DLQ 재처리
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-1">
              <Link href="/admin/ai/mq" className="text-2xl font-bold hover:underline">
                DLQ {fmtNum(overview?.dlqSize)}
              </Link>
              <p className="text-xs text-muted-foreground">
                5개 큐 실시간 모니터링
              </p>
              <p className="text-xs">
                <Link href="/admin/ai/mq" className="text-primary underline-offset-2 hover:underline">
                  큐별 상세 →
                </Link>
              </p>
            </CardContent>
          </Card>

          {/* 위젯 3: OutboxRelay 상태 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">OutboxRelay 상태</CardTitle>
              {hasPermission('SUPER_ADMIN') && (
                <Button size="sm" variant="outline" onClick={handleOutboxRetry}>
                  Outbox 재시도
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex gap-3 text-sm">
                <span>
                  PENDING{' '}
                  <span className="font-bold">{fmtNum(overview?.outboxPending)}</span>
                </span>
                <span>
                  FAILED{' '}
                  <span className="font-bold text-destructive">{fmtNum(overview?.outboxFailed)}</span>
                </span>
              </div>
              <p className="text-xs">
                <Link href="/admin/ai/outbox" className="text-primary underline-offset-2 hover:underline">
                  Outbox 상세 →
                </Link>
              </p>
            </CardContent>
          </Card>

          {/* 위젯 4: Redis 캐시 건강도 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Redis 캐시 건강도</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-2xl font-bold text-success">{fmtPercent(overview?.redisHitRatio)}</div>
              <p className="text-xs text-muted-foreground">Hit Ratio</p>
              <p className="text-xs">
                <Link href="/admin/ai/redis" className="text-primary underline-offset-2 hover:underline">
                  캐시 패턴 상세 →
                </Link>
              </p>
            </CardContent>
          </Card>

          {/* 위젯 5: 일기/리포트 분석 상태 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">분석 상태</CardTitle>
              {hasPermission('SUPER_ADMIN') && (
                <Button size="sm" variant="outline" onClick={handleForceFailDiary}>
                  강제 FAILED 전이
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex gap-3 text-sm">
                <span>
                  처리중{' '}
                  <span className="font-bold">{fmtNum(overview?.analysisProcessing)}</span>
                </span>
                <span>
                  실패{' '}
                  <span className="font-bold text-destructive">{fmtNum(overview?.analysisFailed)}</span>
                </span>
              </div>
              <p className="text-xs">
                <Link href="/admin/ai/analysis" className="text-primary underline-offset-2 hover:underline">
                  분석 상태 상세 →
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* KPI Cards */}
      {/*
        Phase 2-C (2026-04-21): 5개 Card 블록을 공통 KpiCard로 통합. Phase 2-A 세만틱 토큰
        준수 차원에서 purple/blue/green 하드코딩을 text-primary / text-info / text-success 로 치환.
      */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          title="키워드 정확도"
          value="87.3%"
          description="KcELECTRA 평균"
          icon={Brain}
          valueClassName="text-primary"
        />
        <KpiCard
          title="매칭 성공률"
          value="72.5%"
          description="교환일기 진행률"
          icon={Target}
          valueClassName="text-info"
        />
        <KpiCard
          title="일일 분석량"
          value={1234}
          description="오늘 처리된 일기"
          icon={TrendingUp}
        />
        <KpiCard
          title="평균 유사도"
          value="0.68"
          description="KoSimCSE 스코어"
          icon={Activity}
          valueClassName="text-success"
        />
        <KpiCard
          title="추출 키워드"
          value={4521}
          description="오늘 추출된 키워드"
          icon={Zap}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>키워드 카테고리별 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={keywordData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" fontSize={12} />
                <YAxis dataKey="category" type="category" stroke="#6b7280" fontSize={12} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="positive" name="긍정" fill="#22c55e" stackId="a" />
                <Bar dataKey="neutral" name="중립" fill="#6b7280" stackId="a" />
                <Bar dataKey="negative" name="부정" fill="#ef4444" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>매칭 유사도 분포 (KoSimCSE)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={similarityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="range" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value}건`, '매칭 수']}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="매칭 수" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>감정 분석 레이더</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={emotionRadar}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="emotion" stroke="#6b7280" fontSize={12} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#6b7280" fontSize={10} />
                <Radar
                  name="감정 점수"
                  dataKey="value"
                  stroke="#8b5cf6"
                  fill="#c4b5fd"
                  fillOpacity={0.6}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI 모델 성능 지표</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-[280px] items-center justify-around">
              {modelPerformanceData.map((model) => (
                <GaugeChart
                  key={model.name}
                  value={model.value}
                  color={model.color}
                  label={model.name}
                  description={model.description}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
