'use client';

import { useMemo, useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import KpiCard from '@/components/common/KpiCard';
import AnalyticsDateRangePicker, { defaultRange } from '@/components/common/AnalyticsDateRangePicker';
import {
  AnalyticsLoading,
  AnalyticsEmpty,
  AnalyticsError,
  AnalyticsMetaBar,
  AnalyticsToolbar,
  DegradedBadge,
} from '@/components/common/AnalyticsStatus';
import { useRetentionSurvival } from '@/hooks/useAnalytics';
import {
  Activity,
  AlertCircle,
  Clock,
  RefreshCw,
  Shield,
  TrendingDown,
  Users,
} from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * Kaplan-Meier 사용자 이탈 생존분석 (B-2.7) — 관리자 분석 §3.14.
 *
 * 알고리즘 요점:
 *   - S(t) = ∏_{t_i ≤ t} (1 - d_i / n_i)
 *   - Greenwood 분산: Var(S(t)) = S(t)^2 * Σ d_i / (n_i * (n_i - d_i))
 *   - 95% CI: S(t) ± 1.96 * SE(t)
 *
 * 시각화:
 *   - ComposedChart: 신뢰구간 Area(ci=[low, high]) + 생존곡선 Line
 *   - medianSurvivalDay ReferenceLine (S=0.5 교차점)
 *   - 이벤트 시점 Table (day / atRisk / events / S(t) / 95% CI)
 */
export default function SurvivalAnalysisPage() {
  const [range, setRange] = useState(defaultRange(89));
  const [inactivityDays, setInactivityDays] = useState<number>(30);

  const { data, isLoading, isError, error, refetch, isFetching } = useRetentionSurvival({
    ...range,
    inactivityDays,
  });

  // 차트용 데이터: day=0 baseline(S=1) 추가 + ci tuple
  const chartPoints = useMemo(() => {
    if (!data) return [];
    const head = { day: 0, survival: 1, ci: [1, 1] as [number, number], atRisk: data.cohortSize, events: 0 };
    const rest = data.curve.map((p) => ({
      day: p.day,
      survival: p.survivalProbability ?? 0,
      ci: [p.ciLower ?? 0, p.ciUpper ?? 0] as [number, number],
      atRisk: p.atRisk,
      events: p.events,
    }));
    return [head, ...rest];
  }, [data]);

  const curveTail = data?.curve.slice(-30) ?? [];

  const eventRate = data && data.cohortSize > 0
    ? ((data.eventCount / data.cohortSize) * 100).toFixed(1)
    : '0.0';
  const censoredRate = data && data.cohortSize > 0
    ? ((data.censoredCount / data.cohortSize) * 100).toFixed(1)
    : '0.0';

  return (
    <div>
      <PageHeader
        title="사용자 이탈 생존분석 (Kaplan-Meier)"
        description="가입일 기준 이탈 시점 추정 + Greenwood 분산 기반 95% 신뢰구간"
        actions={
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
            새로고침
          </Button>
        }
      />

      {/* Toolbar: 날짜 + inactivityDays */}
      <AnalyticsToolbar>
        <AnalyticsDateRangePicker value={range} onChange={setRange} />
        <div className="flex items-center gap-2 ml-auto">
          <Label htmlFor="inactivity" className="text-xs text-muted-foreground">
            비활동 기준 (일)
          </Label>
          <Input
            id="inactivity"
            type="number"
            min={7}
            max={180}
            value={inactivityDays}
            onChange={(e) => setInactivityDays(Number(e.target.value) || 30)}
            className="h-9 w-[100px]"
          />
        </div>
      </AnalyticsToolbar>

      {/* Meta bar */}
      {data && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <AnalyticsMetaBar
            algorithm={data.meta.algorithm}
            dataSourceVersion={data.meta.dataSourceVersion}
          />
          <DegradedBadge degraded={!!data.meta.degraded} reason="user_activity_events 미적재" />
          <Badge variant="soft-muted" className="text-[11px]">
            이벤트 정의: {data.meta.eventDefinition}
          </Badge>
        </div>
      )}

      {/* KPI */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <KpiCard
          title="코호트 크기"
          value={data?.cohortSize ?? 0}
          description="기간 내 가입 사용자"
          icon={Users}
        />
        <KpiCard
          title="이탈 이벤트"
          value={data?.eventCount ?? 0}
          description={`${eventRate}% (death)`}
          valueClassName="text-destructive"
          icon={TrendingDown}
        />
        <KpiCard
          title="검열(활동중)"
          value={data?.censoredCount ?? 0}
          description={`${censoredRate}% (censored)`}
          valueClassName="text-success"
          icon={Shield}
        />
        <KpiCard
          title="중위 생존기간"
          value={data?.medianSurvivalDay != null ? `${data.medianSurvivalDay}일` : '관측 불가'}
          description="S(t)=0.5 교차 시점"
          icon={Clock}
          valueClassName="text-primary"
        />
      </div>

      {/* Chart */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Kaplan-Meier 생존곡선</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Y축: S(t) = 가입 후 t일 시점 생존확률 · 음영: 95% 신뢰구간 (Greenwood)
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && <AnalyticsLoading height={360} />}
          {isError && (
            <AnalyticsError
              height={360}
              message={(error as Error)?.message}
              onRetry={() => refetch()}
            />
          )}
          {!isLoading && !isError && (!data || chartPoints.length <= 1) && (
            <AnalyticsEmpty
              height={360}
              description="해당 기간에 관측된 이벤트가 없습니다. 기간을 넓히거나 비활동 기준을 조정해 보세요."
            />
          )}
          {!isLoading && !isError && data && chartPoints.length > 1 && (
            <ResponsiveContainer width="100%" height={380}>
              <ComposedChart data={chartPoints}>
                <defs>
                  <linearGradient id="kmCI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="day"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  label={{ value: '가입 후 경과일', position: 'insideBottom', offset: -4, fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 1]}
                  tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  label={{ value: 'S(t)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: unknown, name) => {
                    if (name === '95% CI' && Array.isArray(value)) {
                      return [
                        `${((value[0] as number) * 100).toFixed(1)}% ~ ${((value[1] as number) * 100).toFixed(1)}%`,
                        name,
                      ];
                    }
                    if (typeof value === 'number') {
                      return [`${(value * 100).toFixed(2)}%`, name];
                    }
                    return [String(value), name];
                  }}
                  labelFormatter={(label) => `Day ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="stepAfter"
                  dataKey="ci"
                  name="95% CI"
                  fill="url(#kmCI)"
                  stroke="none"
                  isAnimationActive={false}
                />
                <Line
                  type="stepAfter"
                  dataKey="survival"
                  name="S(t)"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                {data.medianSurvivalDay != null && (
                  <ReferenceLine
                    x={data.medianSurvivalDay}
                    stroke="hsl(var(--destructive))"
                    strokeDasharray="4 4"
                    label={{ value: `median ${data.medianSurvivalDay}일`, fontSize: 10, fill: 'hsl(var(--destructive))' }}
                  />
                )}
                <ReferenceLine y={0.5} stroke="hsl(var(--muted-foreground))" strokeDasharray="2 2" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* 이벤트 시점 Table (최근 30개) */}
      {data && curveTail.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              이벤트 시점 테이블 (최근 {curveTail.length}건)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Day</TableHead>
                  <TableHead className="text-right">At risk (n_i)</TableHead>
                  <TableHead className="text-right">Events (d_i)</TableHead>
                  <TableHead className="text-right">S(t)</TableHead>
                  <TableHead className="text-right">SE</TableHead>
                  <TableHead className="text-right">95% CI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {curveTail.map((p) => (
                  <TableRow key={p.day}>
                    <TableCell className="font-mono-data">{p.day}</TableCell>
                    <TableCell className="text-right font-mono-data">{p.atRisk.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono-data text-destructive">{p.events}</TableCell>
                    <TableCell className="text-right font-mono-data font-semibold">
                      {p.survivalProbability != null ? `${(p.survivalProbability * 100).toFixed(2)}%` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono-data text-muted-foreground">
                      {p.stdError != null ? p.stdError.toFixed(4) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono-data text-muted-foreground">
                      {p.ciLower != null && p.ciUpper != null
                        ? `[${(p.ciLower * 100).toFixed(1)}, ${(p.ciUpper * 100).toFixed(1)}]`
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 알고리즘 설명 섹션 (포트폴리오용) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            알고리즘 노트
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">Kaplan-Meier 추정법</strong> —
            비모수적 생존 함수 추정. 각 이벤트 시점의 conditional survival 을 누적 곱.
          </p>
          <div className="rounded-md bg-muted/40 p-3 font-mono text-xs">
            S(t) = ∏<sub>t_i ≤ t</sub> (1 - d_i / n_i)
          </div>
          <p>
            <strong className="text-foreground">Greenwood 분산</strong> — 로그 생존함수의 델타 방법 기반.
            정확한 95% 신뢰구간 계산.
          </p>
          <div className="rounded-md bg-muted/40 p-3 font-mono text-xs">
            Var(S(t)) = S(t)² · Σ<sub>t_i ≤ t</sub> d_i / (n_i · (n_i − d_i))
            <br />
            95% CI = S(t) ± 1.96 · √Var(S(t))
          </div>
          <p>
            <strong className="text-foreground">구현 방식</strong> —
            PostgreSQL CTE(<code className="text-xs">survival_data → event_times → risk_events</code>)로
            (day, n_i, d_i) 튜플 산출 후 Java 에서 누적 곱·Greenwood 합산.
            외부 라이브러리(lifelines/scipy) 없이 <code className="text-xs">AnalyticsSurvivalRepository</code> + 서비스 계층만으로 완전 구현.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
