import { useState, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import type { VitalSignsDoc } from '@/services/vitals.service';

// ── Metric definitions ────────────────────────────────────────────────────────

interface MetricLine {
  key: string;
  label: string;
  color: string;
}

interface MetricDef {
  id: string;
  label: string;
  unit: string;
  lines: MetricLine[];
  domain?: [number, number];
  references?: { y: number; label: string; color: string; stroke?: string }[];
  extract: (v: VitalSignsDoc) => Record<string, number | null>;
}

const METRICS: MetricDef[] = [
  {
    id: 'bp',
    label: 'Blood Pressure',
    unit: 'mmHg',
    lines: [
      { key: 'systolic',  label: 'Systolic',  color: '#ef4444' },
      { key: 'diastolic', label: 'Diastolic', color: '#3b82f6' },
    ],
    domain: [40, 200],
    references: [
      { y: 120, label: 'Sys 120', color: '#86efac', stroke: '#16a34a' },
      { y: 80,  label: 'Dia 80',  color: '#bfdbfe', stroke: '#2563eb' },
      { y: 140, label: 'High',    color: '#fca5a5', stroke: '#dc2626' },
    ],
    extract: (v) => ({
      systolic:  v.bloodPressure?.systolic  ?? null,
      diastolic: v.bloodPressure?.diastolic ?? null,
    }),
  },
  {
    id: 'pulse',
    label: 'Pulse Rate',
    unit: 'bpm',
    lines: [{ key: 'pulse', label: 'Pulse', color: '#f97316' }],
    domain: [30, 180],
    references: [
      { y: 60,  label: '60 bpm', color: '#fde68a', stroke: '#d97706' },
      { y: 100, label: '100 bpm', color: '#fde68a', stroke: '#d97706' },
    ],
    extract: (v) => ({ pulse: v.pulseRate ?? null }),
  },
  {
    id: 'spo2',
    label: 'SpO₂',
    unit: '%',
    lines: [{ key: 'spo2', label: 'SpO₂', color: '#06b6d4' }],
    domain: [80, 100],
    references: [
      { y: 95, label: '95% normal', color: '#a7f3d0', stroke: '#059669' },
      { y: 90, label: '90% low',    color: '#fca5a5', stroke: '#dc2626' },
    ],
    extract: (v) => ({ spo2: v.spo2 ?? null }),
  },
  {
    id: 'temp',
    label: 'Temperature',
    unit: '°C',
    lines: [{ key: 'temp', label: 'Temp', color: '#a855f7' }],
    domain: [35, 42],
    references: [
      { y: 37.5, label: 'Fever', color: '#fde68a', stroke: '#d97706' },
      { y: 39.0, label: 'High',  color: '#fca5a5', stroke: '#dc2626' },
    ],
    extract: (v) => ({ temp: v.temperature ?? null }),
  },
  {
    id: 'weight',
    label: 'Weight / BMI',
    unit: 'kg',
    lines: [
      { key: 'weight', label: 'Weight (kg)', color: '#10b981' },
      { key: 'bmi',    label: 'BMI',         color: '#6366f1' },
    ],
    extract: (v) => ({
      weight: v.weight ?? null,
      bmi:    v.bmi    ?? null,
    }),
  },
  {
    id: 'sugar',
    label: 'Blood Sugar',
    unit: 'mg/dL',
    lines: [{ key: 'sugar', label: 'Blood Sugar', color: '#f59e0b' }],
    references: [
      { y: 100, label: 'Fasting norm', color: '#a7f3d0', stroke: '#059669' },
      { y: 140, label: 'Post-meal norm', color: '#fde68a', stroke: '#d97706' },
      { y: 200, label: 'High', color: '#fca5a5', stroke: '#dc2626' },
    ],
    extract: (v) => ({ sugar: v.bloodSugar?.value ?? null }),
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

const fmtTooltipDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

// ── Custom tooltip ────────────────────────────────────────────────────────────

const CustomTooltip = ({
  active, payload, label, unit, metric,
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  unit: string;
  metric: MetricDef;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white p-2.5 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1.5">{label ? fmtTooltipDate(label) : ''}</p>
      {payload.map((p) => (
        p.value != null && (
          <div key={p.dataKey} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-medium text-foreground">{Number(p.value).toFixed(1)} {unit}</span>
          </div>
        )
      ))}
    </div>
  );
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  vitals: VitalSignsDoc[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function VitalsTrendChart({ vitals }: Props) {
  const [activeMetric, setActiveMetric] = useState('bp');

  const metric = METRICS.find((m) => m.id === activeMetric) ?? METRICS[0];

  // Build chart data: ascending by date, filter rows where all metric values are null
  const data = useMemo(() => {
    const sorted = [...vitals].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return sorted
      .map((v) => ({ _date: v.createdAt, ...metric.extract(v) }))
      .filter((row) =>
        metric.lines.some((l) => row[l.key as keyof typeof row] != null)
      );
  }, [vitals, metric]);

  const hasData = data.length >= 2;

  return (
    <div className="space-y-3">
      {/* Metric selector */}
      <div className="flex flex-wrap gap-1.5">
        {METRICS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setActiveMetric(m.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              activeMetric === m.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      <div className="rounded-lg border border-border bg-white p-3">
        {!hasData ? (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
            Not enough data to show a trend for <strong className="ml-1">{metric.label}</strong>.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="_date"
                tickFormatter={fmtDate}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={metric.domain ?? ['auto', 'auto']}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={36}
                tickFormatter={(v) => Number(v).toFixed(0)}
              />
              <Tooltip
                content={<CustomTooltip unit={metric.unit} metric={metric} />}
              />
              {metric.lines.length > 1 && (
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                />
              )}

              {/* Reference lines for normal ranges */}
              {metric.references?.map((ref) => (
                <ReferenceLine
                  key={ref.y}
                  y={ref.y}
                  stroke={ref.stroke ?? ref.color}
                  strokeDasharray="4 3"
                  strokeOpacity={0.6}
                  label={{ value: ref.label, position: 'insideTopRight', fontSize: 9, fill: ref.stroke ?? ref.color }}
                />
              ))}

              {/* Data lines */}
              {metric.lines.map((line) => (
                <Line
                  key={line.key}
                  type="monotone"
                  dataKey={line.key}
                  name={line.label}
                  stroke={line.color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: line.color, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
        <p className="text-[10px] text-muted-foreground mt-1 text-right">
          {data.length} reading{data.length !== 1 ? 's' : ''} · {metric.unit}
        </p>
      </div>
    </div>
  );
}
