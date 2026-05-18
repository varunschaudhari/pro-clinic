import { useEffect, useState, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, X } from 'lucide-react';

import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { SlotPicker } from './SlotPicker';

import { patientApi } from '@/services/patient.service';
import type { PatientListItem } from '@/services/patient.service';
import { usersApi } from '@/services/auth.service';
import type { CreateAppointmentPayload, AppointmentMode, VisitType } from '@/services/appointment.service';

// ── Schema ────────────────────────────────────────────────────────────────────

const objectId = /^[a-f\d]{24}$/i;

const schema = z.object({
  patientId:       z.string().regex(objectId, 'Select a patient'),
  doctorId:        z.string().regex(objectId, 'Select a doctor'),
  appointmentDate: z.string().min(1, 'Select a date'),
  slotStart:       z.string().optional(),
  slotEnd:         z.string().optional(),
  mode:            z.enum(['walkin', 'scheduled', 'teleconsult']),
  visitType:       z.enum(['new', 'followup']),
  chiefComplaint:  z.string().trim().max(500).optional(),
  notes:           z.string().trim().max(1000).optional(),
});

export type AppointmentFormValues = z.infer<typeof schema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

const MODE_OPTIONS = [
  { value: 'walkin',      label: 'Walk-in (instant token)' },
  { value: 'scheduled',   label: 'Scheduled (pre-booked)' },
  { value: 'teleconsult', label: 'Teleconsult' },
];

const VISIT_OPTIONS = [
  { value: 'new',      label: 'New Visit' },
  { value: 'followup', label: 'Follow-up' },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

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

// ── Patient search combobox ───────────────────────────────────────────────────

interface PatientSearchProps {
  value: string;
  onChange: (id: string) => void;
  error?: string;
}

const PatientSearch = ({ value, onChange, error }: PatientSearchProps) => {
  const [query, setQuery]           = useState('');
  const [results, setResults]       = useState<PatientListItem[]>([]);
  const [selected, setSelected]     = useState<PatientListItem | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await patientApi.search(query, 8);
        setResults(res.data.data);
        setShowDropdown(true);
      } catch {
        setResults([]);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (p: PatientListItem) => {
    setSelected(p);
    onChange(p._id);
    setQuery('');
    setShowDropdown(false);
  };

  const clear = () => {
    setSelected(null);
    onChange('');
    setQuery('');
  };

  if (selected) {
    return (
      <div className={`flex items-center justify-between gap-2 rounded-md border ${error ? 'border-destructive' : 'border-input'} bg-background px-3 py-2 text-sm`}>
        <div>
          <span className="font-medium text-foreground">{selected.name}</span>
          <span className="ml-2 text-xs text-muted-foreground">
            {selected.patientId} · {selected.mobile}
          </span>
        </div>
        <button type="button" onClick={clear} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <Input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
        onFocus={() => query.length >= 2 && setShowDropdown(true)}
        placeholder="Search patient by name or mobile..."
        leftElement={<Search className="h-4 w-4" />}
        error={!selected && value ? undefined : error}
      />
      {showDropdown && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-white shadow-lg overflow-hidden">
          {results.map((p) => (
            <button
              key={p._id}
              type="button"
              onMouseDown={() => select(p)}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors border-b border-gray-50 last:border-0"
            >
              <span className="font-medium text-foreground">{p.name}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {p.patientId} · {p.mobile} ·{' '}
                <span className="capitalize">{p.gender}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {showDropdown && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-white shadow-lg px-3 py-2.5 text-sm text-muted-foreground">
          No patients found for "{query}"
        </div>
      )}
    </div>
  );
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface AppointmentFormProps {
  defaultDoctorId?: string;
  defaultDate?: string;
  userRole: string;
  userId: string;
  isLoading?: boolean;
  onSubmit: (data: CreateAppointmentPayload) => Promise<void>;
  onCancel?: () => void;
}

// ── Main component ────────────────────────────────────────────────────────────

export const AppointmentForm = ({
  defaultDoctorId,
  defaultDate,
  userRole,
  userId,
  isLoading,
  onSubmit,
  onCancel,
}: AppointmentFormProps) => {
  const [doctors, setDoctors] = useState<{ _id: string; name: string }[]>([]);

  // Fetch doctor list on mount
  useEffect(() => {
    usersApi.listStaff({ limit: 100 })
      .then((res: { data: { data?: unknown[] } }) => {
        const staff = (res.data as { data?: Array<{ _id: string; name: string; role: string; isActive: boolean }> }).data ?? [];
        setDoctors(staff.filter((s) => s.role === 'Doctor' && s.isActive));
      })
      .catch(() => { /* silent — form can still submit */ });
  }, []);

  const doctorOptions = doctors.map((d) => ({ value: d._id, label: d.name }));

  const {
    register, control, handleSubmit, watch,
    setValue, formState: { errors },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      doctorId:        userRole === 'Doctor' ? userId : (defaultDoctorId ?? ''),
      appointmentDate: defaultDate ?? todayStr(),
      mode:            'walkin',
      visitType:       'new',
    },
  });

  // Register doctorId for Doctor role (field not rendered, so setValue ensures it appears in submit values)
  useEffect(() => {
    if (userRole === 'Doctor' && userId) {
      setValue('doctorId', userId, { shouldValidate: false });
    }
  }, [userRole, userId, setValue]);

  const mode     = watch('mode');
  const doctorId = watch('doctorId');
  const apptDate = watch('appointmentDate');
  const showSlot = mode !== 'walkin';

  // Clear slot when doctor or date changes
  useEffect(() => {
    setValue('slotStart', undefined);
    setValue('slotEnd',   undefined);
  }, [doctorId, apptDate, mode, setValue]);

  const handleFormSubmit = (values: AppointmentFormValues) => {
    const payload: CreateAppointmentPayload = {
      patientId:       values.patientId,
      doctorId:        values.doctorId,
      appointmentDate: values.appointmentDate,
      slotStart:       values.slotStart || undefined,
      slotEnd:         values.slotEnd   || undefined,
      mode:            values.mode as AppointmentMode,
      visitType:       values.visitType as VisitType,
      chiefComplaint:  values.chiefComplaint || undefined,
      notes:           values.notes || undefined,
    };
    return onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {/* Patient search */}
      <Field label="Patient" required error={errors.patientId?.message}>
        <Controller
          name="patientId"
          control={control}
          render={({ field }) => (
            <PatientSearch
              value={field.value}
              onChange={field.onChange}
              error={errors.patientId?.message}
            />
          )}
        />
      </Field>

      {/* Doctor */}
      <Field label="Doctor" required error={errors.doctorId?.message}>
        {userRole === 'Doctor' ? (
          <div className="h-9 flex items-center text-sm text-muted-foreground px-3 rounded-md border border-input bg-muted/30">
            My Queue
          </div>
        ) : (
          <Controller
            name="doctorId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                options={doctorOptions}
                placeholder="Select doctor"
                error={errors.doctorId?.message}
              />
            )}
          />
        )}
      </Field>

      {/* Date + Mode + Visit Type */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Field label="Date" required error={errors.appointmentDate?.message}>
          <Input
            {...register('appointmentDate')}
            type="date"
            min={todayStr()}
            error={errors.appointmentDate?.message}
          />
        </Field>

        <Field label="Mode">
          <Controller
            name="mode"
            control={control}
            render={({ field }) => (
              <Select {...field} options={MODE_OPTIONS} />
            )}
          />
        </Field>

        <Field label="Visit Type">
          <Controller
            name="visitType"
            control={control}
            render={({ field }) => (
              <Select {...field} options={VISIT_OPTIONS} />
            )}
          />
        </Field>
      </div>

      {/* Slot picker (for scheduled / teleconsult) */}
      {showSlot && (
        <Controller
          name="slotStart"
          control={control}
          render={({ field }) => (
            <Field label="Select Time Slot" required error={errors.slotStart?.message}>
              {doctorId && apptDate ? (
                <SlotPicker
                  doctorId={doctorId}
                  date={apptDate}
                  value={field.value ?? ''}
                  onChange={(start, end) => {
                    setValue('slotStart', start, { shouldValidate: true });
                    setValue('slotEnd',   end);
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Select a doctor and date first</p>
              )}
            </Field>
          )}
        />
      )}

      {/* Chief complaint */}
      <Field label="Chief Complaint" error={errors.chiefComplaint?.message}>
        <Input
          {...register('chiefComplaint')}
          placeholder="e.g. Fever and cold for 2 days"
          error={errors.chiefComplaint?.message}
        />
      </Field>

      {/* Notes */}
      <Field label="Internal Notes">
        <textarea
          {...register('notes')}
          rows={2}
          placeholder="Any notes for the doctor..."
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent resize-none"
        />
      </Field>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-1">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isLoading}>
          Book Appointment
        </Button>
      </div>
    </form>
  );
};
