import { useEffect, useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Activity } from 'lucide-react';

import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';

import { vitalsApi } from '@/services/vitals.service';
import type { VitalSignsDoc } from '@/services/vitals.service';

// ── Schema ─────────────────────────────────────────────────────────────────────

const optNum = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().min(min, `Min ${min}`).max(max, `Max ${max}`).optional()
  );

const schema = z.object({
  systolic:        optNum(50, 300),
  diastolic:       optNum(20, 200),
  pulseRate:       optNum(0, 300),
  temperature:     optNum(25, 45),
  weight:          optNum(0.5, 500),
  height:          optNum(10, 300),
  spo2:            optNum(0, 100),
  respiratoryRate: optNum(0, 100),
  bsValue:         optNum(0, 2000),
  bsUnit:          z.enum(['mg/dL', 'mmol/L']).default('mg/dL'),
  bsType:          z.enum(['fasting', 'post_meal', 'random', 'hba1c']).optional(),
  painScale:       optNum(0, 10),
  notes:           z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

const BS_UNIT_OPTIONS   = [{ value: 'mg/dL', label: 'mg/dL' }, { value: 'mmol/L', label: 'mmol/L' }];
const BS_TYPE_OPTIONS   = [
  { value: 'fasting',   label: 'Fasting' },
  { value: 'post_meal', label: 'Post-meal' },
  { value: 'random',    label: 'Random' },
  { value: 'hba1c',     label: 'HbA1c' },
];

const PAIN_OPTIONS = Array.from({ length: 11 }, (_, i) => ({
  value: String(i),
  label: i === 0 ? '0 — No pain' : i === 10 ? '10 — Worst' : String(i),
}));

function calcBmi(weight?: number | null, height?: number | null): string {
  if (!weight || !height || height < 10) return '—';
  const bmi = weight / Math.pow(height / 100, 2);
  return bmi.toFixed(1);
}

function bmiColor(bmi: number): string {
  if (bmi < 18.5) return 'text-blue-600';
  if (bmi < 25)   return 'text-green-700';
  if (bmi < 30)   return 'text-orange-600';
  return 'text-red-600';
}

function vitalsToFormValues(v: VitalSignsDoc): FormValues {
  return {
    systolic:        v.bloodPressure?.systolic,
    diastolic:       v.bloodPressure?.diastolic,
    pulseRate:       v.pulseRate,
    temperature:     v.temperature,
    weight:          v.weight,
    height:          v.height,
    spo2:            v.spo2,
    respiratoryRate: v.respiratoryRate,
    bsValue:         v.bloodSugar?.value,
    bsUnit:          (v.bloodSugar?.unit as 'mg/dL' | 'mmol/L') ?? 'mg/dL',
    bsType:          (v.bloodSugar?.type as FormValues['bsType']) ?? undefined,
    painScale:       v.painScale,
    notes:           v.notes ?? '',
  };
}

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label, error, children, hint,
}: {
  label: string; error?: string; children: React.ReactNode; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────

function Section({ title }: { title: string }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">{title}</p>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface VitalsModalProps {
  open:          boolean;
  onClose:       () => void;
  appointmentId: string;
  patientId:     string;
  onSuccess:     (vitals: VitalSignsDoc) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function VitalsModal({ open, onClose, appointmentId, patientId, onSuccess }: VitalsModalProps) {
  const [existing, setExisting]     = useState<VitalSignsDoc | null>(null);
  const [fetching, setFetching]     = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register, control, handleSubmit, reset, watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { bsUnit: 'mg/dL' },
  });

  // Fetch or reset on open/close
  const fetchExisting = useCallback(async () => {
    if (!open || !appointmentId) return;
    setFetching(true);
    setSubmitError(null);
    try {
      const res = await vitalsApi.getByAppointment(appointmentId);
      const data = res.data.data;
      if (data) {
        setExisting(data);
        reset(vitalsToFormValues(data));
      } else {
        setExisting(null);
        reset({ bsUnit: 'mg/dL' });
      }
    } catch {
      setExisting(null);
      reset({ bsUnit: 'mg/dL' });
    } finally {
      setFetching(false);
    }
  }, [open, appointmentId, reset]);

  useEffect(() => { fetchExisting(); }, [fetchExisting]);

  // BMI preview
  const weight = watch('weight');
  const height = watch('height');
  const bmiStr = calcBmi(weight as number | undefined, height as number | undefined);
  const bmiNum = bmiStr !== '—' ? parseFloat(bmiStr) : null;

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    try {
      const bp = values.systolic != null && values.diastolic != null
        ? { systolic: values.systolic, diastolic: values.diastolic }
        : undefined;
      const bs = values.bsValue != null
        ? { value: values.bsValue, unit: values.bsUnit, type: values.bsType ?? 'random' }
        : undefined;

      const payload = {
        appointmentId,
        patientId,
        bloodPressure:   bp,
        pulseRate:       values.pulseRate,
        temperature:     values.temperature,
        weight:          values.weight,
        height:          values.height,
        spo2:            values.spo2,
        respiratoryRate: values.respiratoryRate,
        bloodSugar:      bs,
        painScale:       values.painScale,
        notes:           values.notes || undefined,
      };

      let result: VitalSignsDoc;
      if (existing) {
        const { appointmentId: _a, patientId: _p, ...updatePayload } = payload;
        const res = await vitalsApi.update(existing._id, updatePayload);
        result = res.data.data!;
      } else {
        const res = await vitalsApi.create(payload);
        result = res.data.data!;
      }
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setSubmitError(msg ?? 'Failed to save vitals. Please try again.');
    }
  };

  const handleClose = () => {
    if (!isSubmitting) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={existing ? 'Edit Vital Signs' : 'Record Vital Signs'}
      description={existing ? 'Update the previously recorded values.' : 'Enter the patient\'s current measurements.'}
      size="lg"
    >
      {fetching ? (
        <div className="flex justify-center py-8">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* ── Blood Pressure ─────────────────────────────────────────────── */}
          <Section title="Blood Pressure" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Systolic (mmHg)" error={errors.systolic?.message}>
              <Input
                {...register('systolic')}
                type="number"
                placeholder="120"
                min={50}
                max={300}
                error={errors.systolic?.message}
              />
            </Field>
            <Field label="Diastolic (mmHg)" error={errors.diastolic?.message}>
              <Input
                {...register('diastolic')}
                type="number"
                placeholder="80"
                min={20}
                max={200}
                error={errors.diastolic?.message}
              />
            </Field>
          </div>

          {/* ── Cardiac & Respiratory ──────────────────────────────────────── */}
          <Section title="Cardiac & Respiratory" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Pulse (bpm)" error={errors.pulseRate?.message}>
              <Input
                {...register('pulseRate')}
                type="number"
                placeholder="72"
                min={0}
                max={300}
                error={errors.pulseRate?.message}
              />
            </Field>
            <Field label="SpO₂ (%)" error={errors.spo2?.message}>
              <Input
                {...register('spo2')}
                type="number"
                placeholder="98"
                min={0}
                max={100}
                error={errors.spo2?.message}
              />
            </Field>
            <Field label="Temperature (°C)" error={errors.temperature?.message}>
              <Input
                {...register('temperature')}
                type="number"
                step="0.1"
                placeholder="36.8"
                min={25}
                max={45}
                error={errors.temperature?.message}
              />
            </Field>
            <Field label="Resp. Rate (/min)" error={errors.respiratoryRate?.message}>
              <Input
                {...register('respiratoryRate')}
                type="number"
                placeholder="16"
                min={0}
                max={100}
                error={errors.respiratoryRate?.message}
              />
            </Field>
          </div>

          {/* ── Anthropometric ────────────────────────────────────────────── */}
          <Section title="Anthropometric" />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Weight (kg)" error={errors.weight?.message}>
              <Input
                {...register('weight')}
                type="number"
                step="0.1"
                placeholder="70"
                min={0.5}
                max={500}
                error={errors.weight?.message}
              />
            </Field>
            <Field label="Height (cm)" error={errors.height?.message}>
              <Input
                {...register('height')}
                type="number"
                step="0.1"
                placeholder="170"
                min={10}
                max={300}
                error={errors.height?.message}
              />
            </Field>
            <div className="space-y-1.5">
              <Label>BMI (auto)</Label>
              <div className="h-9 flex items-center rounded-md border border-input bg-muted/30 px-3 text-sm">
                {bmiNum != null ? (
                  <span className={`font-semibold ${bmiColor(bmiNum)}`}>{bmiStr}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>

          {/* ── Blood Sugar ───────────────────────────────────────────────── */}
          <Section title="Blood Sugar" />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Value" error={errors.bsValue?.message}>
              <Input
                {...register('bsValue')}
                type="number"
                step="0.1"
                placeholder="90"
                min={0}
                max={2000}
                error={errors.bsValue?.message}
              />
            </Field>
            <Field label="Unit">
              <Controller
                name="bsUnit"
                control={control}
                render={({ field }) => (
                  <Select {...field} options={BS_UNIT_OPTIONS} />
                )}
              />
            </Field>
            <Field label="Type">
              <Controller
                name="bsType"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || undefined)}
                    options={BS_TYPE_OPTIONS}
                    placeholder="Select type"
                  />
                )}
              />
            </Field>
          </div>

          {/* ── Pain & Notes ──────────────────────────────────────────────── */}
          <Section title="Pain & Notes" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Pain Scale (0-10)" error={errors.painScale?.message}>
              <Controller
                name="painScale"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    value={field.value != null ? String(field.value) : ''}
                    onChange={(e) => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))}
                    options={PAIN_OPTIONS}
                    placeholder="Select scale"
                  />
                )}
              />
            </Field>
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <textarea
                {...register('notes')}
                rows={2}
                placeholder="Any relevant observations..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent resize-none"
              />
              {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
            </div>
          </div>

          {/* ── Error banner ──────────────────────────────────────────────── */}
          {submitError && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <Activity className="h-4 w-4 shrink-0" />
              {submitError}
            </div>
          )}

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {existing ? 'Update Vitals' : 'Save Vitals'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
