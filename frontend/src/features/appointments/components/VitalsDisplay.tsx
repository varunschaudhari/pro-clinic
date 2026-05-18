import type { VitalSignsDoc } from '@/services/vitals.service';

// ── Colour helpers ────────────────────────────────────────────────────────────

function bpColor(s: number, d: number) {
  if (s >= 180 || d >= 120) return 'text-red-600';
  if (s >= 140 || d >= 90)  return 'text-orange-600';
  if (s < 90  || d < 60)   return 'text-blue-600';
  return 'text-green-700';
}

function pulseColor(v: number) {
  if (v > 100 || v < 60) return 'text-orange-600';
  return 'text-green-700';
}

function tempColor(v: number) {
  if (v >= 39)   return 'text-red-600';
  if (v >= 37.5) return 'text-orange-600';
  if (v < 36.1)  return 'text-blue-600';
  return 'text-green-700';
}

function spo2Color(v: number) {
  if (v < 90) return 'text-red-600';
  if (v < 95) return 'text-orange-600';
  return 'text-green-700';
}

function bmiLabel(bmi: number) {
  if (bmi < 18.5) return { text: 'Underweight', color: 'text-blue-600' };
  if (bmi < 25)   return { text: 'Normal',      color: 'text-green-700' };
  if (bmi < 30)   return { text: 'Overweight',  color: 'text-orange-600' };
  return            { text: 'Obese',        color: 'text-red-600' };
}

// ── Chip ──────────────────────────────────────────────────────────────────────

function Chip({ label, value, unit, colorClass = '' }: { label: string; value: string; unit?: string; colorClass?: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 min-w-[72px]">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{label}</span>
      <span className={`text-sm font-bold mt-0.5 ${colorClass}`}>{value}</span>
      {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface VitalsDisplayProps {
  vitals: VitalSignsDoc;
  compact?: boolean; // true = inline chip row; false = full grid
}

// ── Component ─────────────────────────────────────────────────────────────────

export function VitalsDisplay({ vitals: v, compact = false }: VitalsDisplayProps) {
  const bp = v.bloodPressure;

  const chips = [
    bp && {
      label: 'BP',
      value: `${bp.systolic}/${bp.diastolic}`,
      unit:  'mmHg',
      color: bpColor(bp.systolic, bp.diastolic),
    },
    v.pulseRate != null && {
      label: 'Pulse',
      value: String(v.pulseRate),
      unit:  'bpm',
      color: pulseColor(v.pulseRate),
    },
    v.temperature != null && {
      label: 'Temp',
      value: v.temperature.toFixed(1),
      unit:  '°C',
      color: tempColor(v.temperature),
    },
    v.spo2 != null && {
      label: 'SpO₂',
      value: `${v.spo2}%`,
      color: spo2Color(v.spo2),
    },
    v.weight != null && {
      label: 'Weight',
      value: String(v.weight),
      unit:  'kg',
      color: '',
    },
    v.bmi != null && (() => {
      const b = bmiLabel(v.bmi!);
      return { label: 'BMI', value: String(v.bmi), unit: b.text, color: b.color };
    })(),
    v.respiratoryRate != null && {
      label: 'RR',
      value: String(v.respiratoryRate),
      unit:  '/min',
      color: '',
    },
    v.bloodSugar != null && {
      label: 'Sugar',
      value: String(v.bloodSugar.value),
      unit:  v.bloodSugar.unit,
      color: '',
    },
  ].filter(Boolean) as { label: string; value: string; unit?: string; color: string }[];

  if (chips.length === 0 && !v.painScale && !v.notes) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {chips.map((c) => (
          <span
            key={c.label}
            className="inline-flex items-baseline gap-1 rounded bg-gray-50 border border-gray-100 px-2 py-0.5 text-xs"
          >
            <span className="text-muted-foreground">{c.label}</span>
            <span className={`font-semibold ${c.color}`}>{c.value}</span>
            {c.unit && <span className="text-muted-foreground text-[10px]">{c.unit}</span>}
          </span>
        ))}
        {v.painScale != null && (
          <span className="inline-flex items-baseline gap-1 rounded bg-gray-50 border border-gray-100 px-2 py-0.5 text-xs">
            <span className="text-muted-foreground">Pain</span>
            <span className={`font-semibold ${v.painScale >= 7 ? 'text-red-600' : v.painScale >= 4 ? 'text-orange-600' : 'text-green-700'}`}>
              {v.painScale}/10
            </span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <Chip key={c.label} label={c.label} value={c.value} unit={c.unit} colorClass={c.color} />
        ))}
        {v.painScale != null && (
          <Chip
            label="Pain"
            value={`${v.painScale}/10`}
            colorClass={v.painScale >= 7 ? 'text-red-600' : v.painScale >= 4 ? 'text-orange-600' : 'text-green-700'}
          />
        )}
      </div>
      {v.notes && (
        <p className="text-xs text-muted-foreground border-l-2 border-gray-200 pl-2">{v.notes}</p>
      )}
      <p className="text-[10px] text-muted-foreground">
        Recorded by {(v.recordedBy as any)?.name ?? '—'} ·{' '}
        {new Date(v.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}
