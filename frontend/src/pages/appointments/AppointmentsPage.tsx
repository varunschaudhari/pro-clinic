import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, RefreshCw, CalendarDays, Plus,
  Clock, CheckCircle2, XCircle, AlertTriangle, Users,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/app/hooks';
import { useAppointments } from '@/features/appointments/hooks/useAppointments';
import { TokenCard } from '@/features/appointments/components/TokenCard';
import { usersApi } from '@/services/auth.service';
import type { UpdateStatusPayload } from '@/services/appointment.service';
import { useEffect } from 'react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  colorClass: string;
}

const StatCard = ({ icon, label, value, colorClass }: StatCardProps) => (
  <div className={cn('flex items-center gap-3 rounded-lg px-4 py-3 border', colorClass)}>
    <span className="shrink-0">{icon}</span>
    <div>
      <p className="text-xl font-bold leading-none">{value}</p>
      <p className="text-xs mt-0.5 opacity-75">{label}</p>
    </div>
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);

  const [date, setDate]           = useState(todayStr());
  const [doctorId, setDoctorId]   = useState(
    user?.role === 'Doctor' ? (user.id ?? '') : ''
  );
  const [doctors, setDoctors]     = useState<{ _id: string; name: string }[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isDoctor = user?.role === 'Doctor';

  // Fetch doctors for filter dropdown (non-Doctor roles only)
  useEffect(() => {
    if (isDoctor) return;
    usersApi.listStaff({ limit: 100 })
      .then((res: { data: { data?: unknown[] } }) => {
        const staff = (res.data as { data?: Array<{ _id: string; name: string; role: string; isActive: boolean }> }).data ?? [];
        setDoctors(staff.filter((s) => s.role === 'Doctor' && s.isActive));
      })
      .catch(() => { /* silent */ });
  }, [isDoctor]);

  const doctorFilterOptions = [
    { value: '', label: 'All Doctors' },
    ...doctors.map((d) => ({ value: d._id, label: d.name })),
  ];

  const { appointments, stats, isLoading, error, refetch, updateStatus } = useAppointments({
    date,
    doctorId: isDoctor ? user?.id : (doctorId || undefined),
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    refetch();
    setTimeout(() => setIsRefreshing(false), 800);
  }, [refetch]);

  const STATUS_LABELS: Record<string, string> = {
    scheduled: 'Scheduled', confirmed: 'Confirmed', in_progress: 'In Progress',
    completed: 'Completed', cancelled: 'Cancelled', no_show: 'No Show',
  };

  const handleStatusUpdate = useCallback(async (id: string, payload: UpdateStatusPayload) => {
    await updateStatus(id, payload);
    const label = STATUS_LABELS[payload.status] ?? payload.status;
    toast.success(`Appointment marked as ${label}`);
  }, [updateStatus]);

  // Group appointments by status for the queue display order
  const ordered = [
    ...appointments.filter((a) => a.status === 'in_progress'),
    ...appointments.filter((a) => ['scheduled', 'confirmed'].includes(a.status)),
    ...appointments.filter((a) => ['completed', 'cancelled', 'no_show'].includes(a.status)),
  ];

  const totalActive = (stats?.scheduled ?? 0) + (stats?.confirmed ?? 0) + (stats?.in_progress ?? 0);

  return (
    <div className="space-y-5">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">Appointments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Token-based queue · {formatDisplayDate(date)}
          </p>
        </div>
        <Button
          onClick={() => navigate('/appointments/new')}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Book Appointment
        </Button>
      </div>

      {/* ── Controls ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date navigation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDate((d) => addDays(d, -1))}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-input hover:bg-accent transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDate(todayStr())}
              className={cn(
                'px-3 h-8 text-sm font-medium rounded-md border transition-colors',
                date === todayStr()
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input hover:bg-accent'
              )}
            >
              Today
            </button>
            <button
              onClick={() => setDate((d) => addDays(d, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-input hover:bg-accent transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Date picker */}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-8 rounded-md border border-input px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Doctor filter (admin/receptionist only) */}
          {!isDoctor && (
            <div className="w-48">
              <Select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                options={doctorFilterOptions}
              />
            </div>
          )}

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 h-8 px-3 text-sm text-muted-foreground hover:text-foreground rounded-md border border-input hover:bg-accent transition-colors ml-auto"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Stats bar ──────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            icon={<Users className="h-5 w-5 text-gray-500" />}
            label="Waiting"
            value={(stats.scheduled + stats.confirmed)}
            colorClass="bg-gray-50 border-gray-200 text-gray-700"
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-amber-500" />}
            label="In Progress"
            value={stats.in_progress}
            colorClass="bg-amber-50 border-amber-200 text-amber-700"
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
            label="Completed"
            value={stats.completed}
            colorClass="bg-green-50 border-green-200 text-green-700"
          />
          <StatCard
            icon={<XCircle className="h-5 w-5 text-red-400" />}
            label="Cancelled"
            value={stats.cancelled}
            colorClass="bg-red-50 border-red-200 text-red-700"
          />
          <StatCard
            icon={<AlertTriangle className="h-5 w-5 text-orange-400" />}
            label="No Show"
            value={stats.no_show}
            colorClass="bg-orange-50 border-orange-200 text-orange-700"
          />
          <StatCard
            icon={<Users className="h-5 w-5 text-primary" />}
            label="Total Active"
            value={totalActive}
            colorClass="bg-primary/5 border-primary/20 text-primary"
          />
        </div>
      )}

      {/* ── Queue ──────────────────────────────────────────────────── */}
      {error && <Alert variant="error">{error}</Alert>}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : ordered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="h-14 w-14 rounded-full bg-gray-50 flex items-center justify-center mb-3">
              <CalendarDays className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">No appointments</p>
            <p className="text-xs text-muted-foreground mt-1">
              {date === todayStr()
                ? 'Book the first appointment of the day'
                : `No appointments scheduled for ${formatDisplayDate(date)}`}
            </p>
            <Button
              size="sm"
              className="mt-4"
              onClick={() => navigate('/appointments/new')}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Book Appointment
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Section: In Progress */}
          {ordered.some((a) => a.status === 'in_progress') && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 px-1">
                In Consultation
              </p>
              {ordered
                .filter((a) => a.status === 'in_progress')
                .map((appt) => (
                  <TokenCard
                    key={appt._id}
                    appointment={appt}
                    userRole={user?.role ?? ''}
                    onStatusUpdate={handleStatusUpdate}
                    onViewPatient={(pid) => navigate(`/patients/${pid}`)}
                  />
                ))}
            </>
          )}

          {/* Section: Waiting */}
          {ordered.some((a) => ['scheduled', 'confirmed'].includes(a.status)) && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 mt-4">
                Waiting Queue
              </p>
              {ordered
                .filter((a) => ['scheduled', 'confirmed'].includes(a.status))
                .map((appt) => (
                  <TokenCard
                    key={appt._id}
                    appointment={appt}
                    userRole={user?.role ?? ''}
                    onStatusUpdate={handleStatusUpdate}
                    onViewPatient={(pid) => navigate(`/patients/${pid}`)}
                  />
                ))}
            </>
          )}

          {/* Section: Done */}
          {ordered.some((a) => ['completed', 'cancelled', 'no_show'].includes(a.status)) && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1 mt-4">
                Completed / Closed
              </p>
              {ordered
                .filter((a) => ['completed', 'cancelled', 'no_show'].includes(a.status))
                .map((appt) => (
                  <TokenCard
                    key={appt._id}
                    appointment={appt}
                    userRole={user?.role ?? ''}
                    onStatusUpdate={handleStatusUpdate}
                    onViewPatient={(pid) => navigate(`/patients/${pid}`)}
                  />
                ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
