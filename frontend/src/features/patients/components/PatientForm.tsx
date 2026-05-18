import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Phone, MapPin, Heart, FileText } from 'lucide-react';

import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { TagInput } from '@/components/ui/TagInput';
import { Alert } from '@/components/ui/Alert';

import {
  BLOOD_GROUP_OPTIONS, GENDER_OPTIONS, AGE_UNIT_OPTIONS,
  SOURCE_OPTIONS, COMMON_ALLERGIES, COMMON_CONDITIONS, RELATION_OPTIONS,
} from '@/constants/medical';
import { INDIAN_STATES } from '@/constants/india';
import { patientApi } from '@/services/patient.service';
import type { CreatePatientPayload } from '@/services/patient.service';

// ── Schema ────────────────────────────────────────────────────────────────────

const numOpt = (min: number, max: number) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(min, `Min ${min}`).max(max, `Max ${max}`).optional()
  );

const schema = z.object({
  name: z.string().trim().min(2, 'Minimum 2 characters').max(100),
  mobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Select a gender' }),
  ageMode: z.enum(['dob', 'age']),
  dob: z.string().optional(),
  age: numOpt(0, 150),
  ageUnit: z.enum(['years', 'months', 'days']).default('years'),
  bloodGroup: z.string().optional(),
  height: numOpt(10, 300),
  weight: numOpt(0.5, 500),
  alternateMobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Invalid mobile').optional().or(z.literal('')),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  addressLine1: z.string().trim().max(200).optional(),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().optional(),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter 6-digit pincode').optional().or(z.literal('')),
  emergencyName: z.string().trim().max(100).optional(),
  emergencyMobile: z.string().trim().regex(/^[6-9]\d{9}$/, 'Invalid mobile').optional().or(z.literal('')),
  emergencyRelation: z.string().optional(),
  allergies: z.array(z.string()).default([]),
  chronicConditions: z.array(z.string()).default([]),
  currentMedications: z.array(z.string()).default([]),
  insuranceProvider: z.string().trim().max(100).optional(),
  insurancePolicyNumber: z.string().trim().max(100).optional(),
  insuranceValidTill: z.string().optional(),
  aadharLast4: z.string().trim().regex(/^\d{4}$/, 'Enter last 4 Aadhar digits').optional().or(z.literal('')),
  abhaId: z.string().trim().optional(),
  source: z.string().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type PatientFormValues = z.infer<typeof schema>;

// ── Helper sub-components ─────────────────────────────────────────────────────

const STATE_OPTIONS = INDIAN_STATES.map((s) => ({ value: s, label: s }));

const SectionCard = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
    <div className="flex items-center gap-2 mb-4 pb-2.5 border-b border-gray-100">
      <span className="text-primary h-4 w-4">{icon}</span>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
    {children}
  </div>
);

const Field = ({
  label, required, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <Label required={required}>{label}</Label>
    {children}
    {error && <p className="text-xs text-destructive">{error}</p>}
  </div>
);

// ── Props ─────────────────────────────────────────────────────────────────────

interface PatientFormProps {
  defaultValues?: Partial<PatientFormValues>;
  onSubmit: (data: CreatePatientPayload) => Promise<void>;
  isLoading?: boolean;
  mode: 'create' | 'edit';
  onCancel?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const PatientForm = ({ defaultValues, onSubmit, isLoading, mode, onCancel }: PatientFormProps) => {
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const {
    register, control, handleSubmit, watch,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      ageMode: 'age',
      ageUnit: 'years',
      allergies: [],
      chronicConditions: [],
      currentMedications: [],
      ...defaultValues,
    },
  });

  const ageMode = watch('ageMode');
  const mobile  = watch('mobile');

  // Debounced duplicate mobile check (create only)
  useEffect(() => {
    if (mode !== 'create') return;
    if (!/^[6-9]\d{9}$/.test(mobile ?? '')) {
      setDuplicateWarning(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await patientApi.search(mobile, 1);
        const hit = res.data.data[0];
        if (hit) {
          setDuplicateWarning(
            `A patient with this mobile already exists: ${hit.name} (${hit.patientId})`
          );
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        setDuplicateWarning(null);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [mobile, mode]);

  const handleFormSubmit = (values: PatientFormValues) => {
    const payload: CreatePatientPayload = {
      name: values.name,
      mobile: values.mobile,
      gender: values.gender,
      ...(values.ageMode === 'dob'
        ? { dob: values.dob || undefined }
        : { age: values.age, ageUnit: values.ageUnit }
      ),
      bloodGroup: values.bloodGroup || undefined,
      height: values.height ?? undefined,
      weight: values.weight ?? undefined,
      alternateMobile: values.alternateMobile || undefined,
      email: values.email || undefined,
      addressLine1: values.addressLine1 || undefined,
      addressLine2: values.addressLine2 || undefined,
      city: values.city || undefined,
      state: values.state || undefined,
      pincode: values.pincode || undefined,
      emergencyName: values.emergencyName || undefined,
      emergencyMobile: values.emergencyMobile || undefined,
      emergencyRelation: values.emergencyRelation || undefined,
      allergies: values.allergies,
      chronicConditions: values.chronicConditions,
      currentMedications: values.currentMedications,
      insuranceProvider: values.insuranceProvider || undefined,
      insurancePolicyNumber: values.insurancePolicyNumber || undefined,
      insuranceValidTill: values.insuranceValidTill || undefined,
      aadharLast4: values.aadharLast4 || undefined,
      abhaId: values.abhaId || undefined,
      source: values.source || undefined,
      notes: values.notes || undefined,
    };
    return onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">

      {/* ── Section 1: Basic Information ─────────────────────────────── */}
      <SectionCard icon={<User className="h-4 w-4" />} title="Basic Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Field label="Full Name" required error={errors.name?.message}>
              <Input {...register('name')} placeholder="Patient full name" error={errors.name?.message} />
            </Field>
          </div>

          <Field label="Mobile Number" required error={errors.mobile?.message}>
            <Input
              {...register('mobile')}
              placeholder="10-digit mobile"
              maxLength={10}
              inputMode="numeric"
              error={errors.mobile?.message}
            />
          </Field>

          <Field label="Gender" required error={errors.gender?.message}>
            <Controller
              name="gender"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  options={[...GENDER_OPTIONS]}
                  placeholder="Select gender"
                  error={errors.gender?.message}
                />
              )}
            />
          </Field>
        </div>

        {duplicateWarning && (
          <div className="mt-3">
            <Alert variant="warning">{duplicateWarning}</Alert>
          </div>
        )}

        {/* Age mode toggle */}
        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-5 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Age Information</span>
            <div className="flex items-center gap-4">
              {(['age', 'dob'] as const).map((mode) => (
                <Controller
                  key={mode}
                  name="ageMode"
                  control={control}
                  render={({ field }) => (
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none">
                      <input
                        type="radio"
                        value={mode}
                        checked={field.value === mode}
                        onChange={() => field.onChange(mode)}
                        className="accent-primary"
                      />
                      {mode === 'age' ? 'Enter Age' : 'Enter Date of Birth'}
                    </label>
                  )}
                />
              ))}
            </div>
          </div>

          {ageMode === 'dob' ? (
            <Field label="Date of Birth" error={errors.dob?.message}>
              <Input
                {...register('dob')}
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                error={errors.dob?.message}
              />
            </Field>
          ) : (
            <div className="flex gap-3 items-start">
              <div className="flex-1">
                <Field label="Age" error={(errors.age as { message?: string } | undefined)?.message}>
                  <Input
                    {...register('age')}
                    type="number"
                    min={0}
                    max={150}
                    placeholder="e.g. 35"
                    error={(errors.age as { message?: string } | undefined)?.message}
                  />
                </Field>
              </div>
              <div className="w-36 shrink-0">
                <Field label="Unit">
                  <Controller
                    name="ageUnit"
                    control={control}
                    render={({ field }) => (
                      <Select {...field} options={[...AGE_UNIT_OPTIONS]} />
                    )}
                  />
                </Field>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Field label="Blood Group">
            <Controller
              name="bloodGroup"
              control={control}
              render={({ field }) => (
                <Select {...field} options={BLOOD_GROUP_OPTIONS} placeholder="Select" />
              )}
            />
          </Field>
          <Field label="Height (cm)" error={(errors.height as { message?: string } | undefined)?.message}>
            <Input
              {...register('height')}
              type="number"
              min={10}
              max={300}
              placeholder="e.g. 165"
              error={(errors.height as { message?: string } | undefined)?.message}
            />
          </Field>
          <Field label="Weight (kg)" error={(errors.weight as { message?: string } | undefined)?.message}>
            <Input
              {...register('weight')}
              type="number"
              min={0.5}
              max={500}
              step={0.1}
              placeholder="e.g. 65"
              error={(errors.weight as { message?: string } | undefined)?.message}
            />
          </Field>
        </div>
      </SectionCard>

      {/* ── Section 2: Contact & Address ─────────────────────────────── */}
      <SectionCard icon={<MapPin className="h-4 w-4" />} title="Contact & Address">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Alternate Mobile" error={errors.alternateMobile?.message}>
            <Input
              {...register('alternateMobile')}
              placeholder="Optional"
              maxLength={10}
              inputMode="numeric"
              error={errors.alternateMobile?.message}
            />
          </Field>
          <Field label="Email Address" error={errors.email?.message}>
            <Input
              {...register('email')}
              type="email"
              placeholder="patient@email.com"
              error={errors.email?.message}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Address Line 1">
              <Input {...register('addressLine1')} placeholder="House / Flat No., Street" />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Address Line 2">
              <Input {...register('addressLine2')} placeholder="Locality, Landmark" />
            </Field>
          </div>
          <Field label="City">
            <Input {...register('city')} placeholder="e.g. Mumbai" />
          </Field>
          <Field label="State">
            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <Select {...field} options={STATE_OPTIONS} placeholder="Select state" />
              )}
            />
          </Field>
          <Field label="Pincode" error={errors.pincode?.message}>
            <Input
              {...register('pincode')}
              placeholder="6-digit pincode"
              maxLength={6}
              inputMode="numeric"
              error={errors.pincode?.message}
            />
          </Field>
        </div>
      </SectionCard>

      {/* ── Section 3: Emergency Contact ─────────────────────────────── */}
      <SectionCard icon={<Phone className="h-4 w-4" />} title="Emergency Contact">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Contact Name">
            <Input {...register('emergencyName')} placeholder="Full name" />
          </Field>
          <Field label="Mobile Number" error={errors.emergencyMobile?.message}>
            <Input
              {...register('emergencyMobile')}
              placeholder="10-digit mobile"
              maxLength={10}
              inputMode="numeric"
              error={errors.emergencyMobile?.message}
            />
          </Field>
          <Field label="Relation">
            <Controller
              name="emergencyRelation"
              control={control}
              render={({ field }) => (
                <Select {...field} options={[...RELATION_OPTIONS]} placeholder="Select relation" />
              )}
            />
          </Field>
        </div>
      </SectionCard>

      {/* ── Section 4: Medical Background ────────────────────────────── */}
      <SectionCard icon={<Heart className="h-4 w-4" />} title="Medical Background">
        <div className="space-y-4">
          <Field label="Known Allergies">
            <Controller
              name="allergies"
              control={control}
              render={({ field }) => (
                <TagInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Type and press Enter, or select from list"
                  suggestions={COMMON_ALLERGIES}
                />
              )}
            />
          </Field>
          <Field label="Chronic Conditions">
            <Controller
              name="chronicConditions"
              control={control}
              render={({ field }) => (
                <TagInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Type and press Enter, or select from list"
                  suggestions={COMMON_CONDITIONS}
                />
              )}
            />
          </Field>
          <Field label="Current Medications">
            <Controller
              name="currentMedications"
              control={control}
              render={({ field }) => (
                <TagInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Type medication name and press Enter"
                />
              )}
            />
          </Field>
        </div>
      </SectionCard>

      {/* ── Section 5: Additional Information ────────────────────────── */}
      <SectionCard icon={<FileText className="h-4 w-4" />} title="Additional Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Insurance</p>
            <div className="space-y-3">
              <Field label="Insurance Provider">
                <Input {...register('insuranceProvider')} placeholder="e.g. Star Health" />
              </Field>
              <Field label="Policy Number">
                <Input {...register('insurancePolicyNumber')} placeholder="Policy / Member ID" />
              </Field>
              <Field label="Valid Till">
                <Input {...register('insuranceValidTill')} type="date" />
              </Field>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
              Identity & Source
            </p>
            <div className="space-y-3">
              <Field label="ABHA ID">
                <Input {...register('abhaId')} placeholder="14-digit ABHA number" />
              </Field>
              <Field label="Aadhar Last 4 Digits" error={errors.aadharLast4?.message}>
                <Input
                  {...register('aadharLast4')}
                  placeholder="XXXX"
                  maxLength={4}
                  inputMode="numeric"
                  error={errors.aadharLast4?.message}
                />
              </Field>
              <Field label="Patient Source">
                <Controller
                  name="source"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} options={[...SOURCE_OPTIONS]} placeholder="How did patient find us?" />
                  )}
                />
              </Field>
            </div>
          </div>

          <div className="md:col-span-2">
            <Field label="Notes / Remarks">
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="Any additional notes about the patient..."
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent disabled:cursor-not-allowed disabled:opacity-50 resize-none"
              />
            </Field>
          </div>
        </div>
      </SectionCard>

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-1">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isLoading}>
          {mode === 'create' ? 'Register Patient' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};
