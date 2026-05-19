import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, CalendarOff, CheckCircle2, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input }  from '@/components/ui/Input';
import { Label }  from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';

import {
  scheduleApi,
  type DoctorWithSchedule,
  type DoctorScheduleDay,
  type DoctorLeave,
} from '@/services/schedule.service';
import { getErrorMessage } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SLOT_DURATION_OPTIONS = [
  { value: '10',  label: '10 min' },
  { value: '15',  label: '15 min' },
  { value: '20',  label: '20 min' },
  { value: '30',  label: '30 min' },
  { value: '45',  label: '45 min' },
  { value: '60',  label: '60 min (1 hr)' },
];

const MAX_PATIENTS_OPTIONS = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1),
}));

// ── Schedule editor ───────────────────────────────────────────────────────────

const DEFAULT_DAY: Omit<DoctorScheduleDay, 'dayOfWeek'> = {
  startTime: '09:00',
  endTime:   '17:00',
  slotDurationMinutes: 30,
  maxPatientsPerSlot:  1,
  isActive: false,
};

interface DayRowProps {
  dayOfWeek: number;
  row: DoctorScheduleDay;
  onChange: (d: DoctorScheduleDay) => void;
}

const DayRow = ({ dayOfWeek, row, onChange }: DayRowProps) => {
  const toggle = () => onChange({ ...row, isActive: !row.isActive });

  return (
    <div className={cn(
      'grid grid-cols-[80px_1fr] gap-x-4 gap-y-2 rounded-lg border p-3 transition-colors',
      row.isActive ? 'border-primary/30 bg-primary/5' : 'border-gray-100 bg-gray-50/50'
    )}>
      {/* Day toggle */}
      <div className="flex items-start pt-1">
        <button
          type="button"
          onClick={toggle}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors',
            row.isActive
              ? 'bg-primary text-primary-foreground'
              : 'bg-white border border-gray-200 text-muted-foreground hover:border-primary/50'
          )}
        >
          {DAYS[dayOfWeek]}
        </button>
      </div>

      {/* Time + config */}
      {row.isActive ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Start</Label>
            <Input
              type="time"
              value={row.startTime}
              onChange={(e) => onChange({ ...row, startTime: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">End</Label>
            <Input
              type="time"
              value={row.endTime}
              onChange={(e) => onChange({ ...row, endTime: e.target.value })}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Slot</Label>
            <Select
              value={String(row.slotDurationMinutes)}
              options={SLOT_DURATION_OPTIONS}
              onChange={(val) => onChange({ ...row, slotDurationMinutes: Number(val) })}
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Max / slot</Label>
            <Select
              value={String(row.maxPatientsPerSlot)}
              options={MAX_PATIENTS_OPTIONS}
              onChange={(val) => onChange({ ...row, maxPatientsPerSlot: Number(val) })}
              className="h-8 text-sm"
            />
          </div>
        </div>
      ) : (
        <p className="flex items-center text-xs text-muted-foreground">Not working</p>
      )}
    </div>
  );
};

// ── Leave form ────────────────────────────────────────────────────────────────

const leaveSchema = z.object({
  mode:      z.enum(['single', 'range']),
  date:      z.string().optional(),
  startDate: z.string().optional(),
  endDate:   z.string().optional(),
  isFullDay: z.string(),
  startTime: z.string().optional(),
  endTime:   z.string().optional(),
  reason:    z.string().trim().max(200).optional(),
});

type LeaveFormValues = z.infer<typeof leaveSchema>;

const todayStr = () => new Date().toISOString().slice(0, 10);

interface LeavesProps {
  doctorId: string;
}

const LeavesPanel = ({ doctorId }: LeavesProps) => {
  const [leaves, setLeaves]         = useState<DoctorLeave[]>([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [conflictWarn, setConflictWarn] = useState('');

  const { register, handleSubmit, watch, reset, formState: { errors } } =
    useForm<LeaveFormValues>({
      resolver: zodResolver(leaveSchema),
      defaultValues: { mode: 'single', isFullDay: 'true', date: todayStr() },
    });

  const mode      = watch('mode');
  const isFullDay = watch('isFullDay') === 'true';

  const load = () => {
    setLoading(true);
    const from = todayStr();
    const to   = `${new Date().getFullYear()}-12-31`;
    scheduleApi.getLeaves(doctorId, from, to)
      .then((r) => setLeaves(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [doctorId]);

  const onSubmit = async (values: LeaveFormValues) => {
    setSaving(true);
    setSubmitError('');
    setConflictWarn('');
    try {
      if (values.mode === 'range') {
        if (!values.startDate || !values.endDate) {
          setSubmitError('Start and end dates are required');
          return;
        }
        const res = await scheduleApi.addLeaveRange(doctorId, {
          startDate: values.startDate,
          endDate:   values.endDate,
          reason:    values.reason || undefined,
        });
        if (res.data.data.hasConflict) {
          setConflictWarn('Appointments exist in this date range — please review or cancel them.');
        }
      } else {
        if (!values.date) {
          setSubmitError('Date is required');
          return;
        }
        const res = await scheduleApi.addLeave(doctorId, {
          date:      values.date,
          isFullDay: values.isFullDay === 'true',
          startTime: values.isFullDay !== 'true' ? values.startTime : undefined,
          endTime:   values.isFullDay !== 'true' ? values.endTime   : undefined,
          reason:    values.reason || undefined,
        });
        if (res.data.data.hasConflict) {
          setConflictWarn('Appointments exist on this date — please review or cancel them.');
        }
      }
      reset({ mode: 'single', isFullDay: 'true', date: todayStr() });
      setShowForm(false);
      load();
    } catch (e) {
      setSubmitError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (leaveId: string) => {
    if (!window.confirm('Remove this leave entry?')) return;
    try {
      await scheduleApi.deleteLeave(doctorId, leaveId);
      setLeaves((prev) => prev.filter((l) => l._id !== leaveId));
    } catch (e) {
      alert(getErrorMessage(e));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Upcoming Leaves</h3>
        <Button size="sm" variant="outline" onClick={() => { setShowForm((v) => !v); setSubmitError(''); setConflictWarn(''); }}>
          <Plus className="h-4 w-4 mr-1" /> Add Leave
        </Button>
      </div>

      {conflictWarn && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {conflictWarn}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
          {/* Mode toggle */}
          <div className="flex gap-1 rounded-md border border-amber-200 p-0.5 bg-amber-100/50 w-fit">
            {(['single', 'range'] as const).map((m) => (
              <label key={m} className={cn(
                'px-3 py-1 rounded text-xs font-medium cursor-pointer transition-colors',
                watch('mode') === m ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground'
              )}>
                <input type="radio" value={m} {...register('mode')} className="sr-only" />
                {m === 'single' ? 'Single day' : 'Date range'}
              </label>
            ))}
          </div>

          {mode === 'single' ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label required className="text-xs">Date</Label>
                <Input type="date" min={todayStr()} {...register('date')} className="h-8 text-sm" />
                {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <select
                  {...register('isFullDay')}
                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                >
                  <option value="true">Full day</option>
                  <option value="false">Partial day</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label required className="text-xs">From</Label>
                <Input type="date" min={todayStr()} {...register('startDate')} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label required className="text-xs">To</Label>
                <Input type="date" min={todayStr()} {...register('endDate')} className="h-8 text-sm" />
              </div>
            </div>
          )}

          {mode === 'single' && !isFullDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input type="time" {...register('startTime')} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Until</Label>
                <Input type="time" {...register('endTime')} className="h-8 text-sm" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs">Reason (optional)</Label>
            <Input {...register('reason')} placeholder="e.g. Personal, Emergency" className="h-8 text-sm" />
          </div>

          {submitError && (
            <p className="text-xs text-destructive">{submitError}</p>
          )}

          <div className="flex gap-2 justify-end">
            <Button type="button" size="sm" variant="outline" onClick={() => { setShowForm(false); setSubmitError(''); }}>Cancel</Button>
            <Button type="submit" size="sm" isLoading={saving}>Save Leave</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-4"><Spinner size="sm" /></div>
      ) : leaves.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No upcoming leaves</p>
      ) : (
        <ul className="space-y-2">
          {leaves.map((l) => (
            <li key={l._id} className="flex items-center justify-between gap-2 rounded-md border border-gray-100 bg-white px-3 py-2 text-sm">
              <div>
                <span className="font-medium text-foreground">{FULL_DAYS[new Date(l.date + 'T12:00:00').getDay()]}, {l.date}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {l.isFullDay ? 'Full day' : `${l.startTime} – ${l.endTime}`}
                  {l.reason && ` · ${l.reason}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => remove(l._id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── Schedule editor panel ────────────────────────────────────────────────────

interface EditorProps {
  doctor: DoctorWithSchedule;
}

const DoctorScheduleEditor = ({ doctor }: EditorProps) => {
  const [rows, setRows]     = useState<DoctorScheduleDay[]>(
    Array.from({ length: 7 }, (_, i) => ({ ...DEFAULT_DAY, dayOfWeek: i }))
  );
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  useEffect(() => {
    scheduleApi.getSchedule(doctor._id)
      .then((r) => {
        if (r.data.data.length > 0) {
          // Merge fetched days into the 7-slot array
          setRows((prev) => prev.map((row) => {
            const found = r.data.data.find((d) => d.dayOfWeek === row.dayOfWeek);
            return found ? { ...found } : row;
          }));
        }
      })
      .catch(() => {});
  }, [doctor._id]);

  const updateRow = (dayOfWeek: number, updated: DoctorScheduleDay) => {
    setRows((prev) => prev.map((r) => r.dayOfWeek === dayOfWeek ? updated : r));
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const activeDays = rows.filter((r) => r.isActive);
      if (activeDays.length === 0) return;
      await scheduleApi.upsertSchedule(doctor._id, { days: rows });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      /* error ignored; could toast here */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">{doctor.name}</h2>
          {doctor.specialization && (
            <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
          )}
        </div>
        <Button onClick={save} isLoading={saving} size="sm">
          {saved ? (
            <><CheckCircle2 className="h-4 w-4 mr-1 text-green-500" /> Saved</>
          ) : 'Save Schedule'}
        </Button>
      </div>

      {/* Day rows */}
      <div className="space-y-2">
        {rows.map((row) => (
          <DayRow
            key={row.dayOfWeek}
            dayOfWeek={row.dayOfWeek}
            row={row}
            onChange={(updated) => updateRow(row.dayOfWeek, updated)}
          />
        ))}
      </div>

      <hr />

      {/* Leaves */}
      <LeavesPanel doctorId={doctor._id} />
    </div>
  );
};

// ── Page ─────────────────────────────────────────────────────────────────────

export const ScheduleManagementPage = () => {
  const [doctors, setDoctors]   = useState<DoctorWithSchedule[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<DoctorWithSchedule | null>(null);

  useEffect(() => {
    scheduleApi.listDoctors()
      .then((r) => {
        setDoctors(r.data.data);
        if (r.data.data.length > 0) setSelected(r.data.data[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Spinner size="lg" />
      </div>
    );
  }

  if (doctors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-60 text-muted-foreground gap-2">
        <CalendarOff className="h-10 w-10 opacity-30" />
        <p className="text-sm">No doctors found. Invite doctors from Staff Management first.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Doctor list sidebar */}
      <aside className="w-56 shrink-0 border-r border-gray-100 overflow-y-auto">
        <div className="px-3 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Doctors</p>
        </div>
        <ul className="py-1">
          {doctors.map((d) => (
            <li key={d._id}>
              <button
                type="button"
                onClick={() => setSelected(d)}
                className={cn(
                  'w-full text-left px-3 py-2.5 transition-colors',
                  selected?._id === d._id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-accent text-foreground'
                )}
              >
                <p className="text-sm truncate">{d.name}</p>
                {d.specialization && (
                  <p className="text-xs text-muted-foreground truncate">{d.specialization}</p>
                )}
                {d.activeDays.length > 0 && (
                  <p className="text-xs text-primary/70 mt-0.5">
                    {d.activeDays.sort().map((n) => DAYS[n]).join(', ')}
                  </p>
                )}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto p-6">
        {selected ? (
          <DoctorScheduleEditor key={selected._id} doctor={selected} />
        ) : (
          <p className="text-sm text-muted-foreground">Select a doctor to edit their schedule</p>
        )}
      </div>
    </div>
  );
};

export default ScheduleManagementPage;
