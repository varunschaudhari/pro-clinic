import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, Tooltip as RTooltip,
} from 'recharts';
import {
  Users, Calendar, FlaskConical, CreditCard, FileText,
  Clock, Package, AlertTriangle, CheckCircle2, ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { formatDate } from '@/lib/utils';
import { dashboardApi, type DashboardSummary } from '@/services/dashboard.service';

// ── Appointment status badge ─────────────────────────────────────────────────
const APPT_STATUS_BADGE: Record<string, string> = {
  scheduled:   'bg-gray-100 text-gray-700',
  confirmed:   'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
};

const APPT_STATUS_LABEL: Record<string, string> = {
  scheduled:   'Scheduled',
  confirmed:   'Confirmed',
  in_progress: 'In Progress',
  completed:   'Completed',
  cancelled:   'Cancelled',
};

// ── Quick actions ────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { label: 'New Patient',        href: '/patients/new',       icon: Users,      roles: ['ClinicAdmin', 'Doctor', 'Receptionist'] },
  { label: 'Book Appointment',   href: '/appointments/new',   icon: Calendar,   roles: ['ClinicAdmin', 'Doctor', 'Receptionist'] },
  { label: 'Write Prescription', href: '/prescriptions/new',  icon: FileText,   roles: ['ClinicAdmin', 'Doctor'] },
  { label: 'Raise Invoice',      href: '/billing/new',        icon: CreditCard, roles: ['ClinicAdmin', 'Receptionist'] },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const fmtDay = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });

// ── Stat card skeleton ───────────────────────────────────────────────────────
function StatSkeleton() {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="animate-pulse space-y-2">
          <div className="h-3 bg-muted rounded w-2/3" />
          <div className="h-8 bg-muted rounded w-1/2 mt-3" />
          <div className="h-3 bg-muted rounded w-3/4" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Mini bar chart tooltip ───────────────────────────────────────────────────
function MiniTooltip({ active, payload, label, prefix = '' }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-white px-2.5 py-1.5 text-xs shadow-md">
      <p className="text-muted-foreground mb-0.5">{fmtDay(label)}, {label?.slice(8)}</p>
      <p className="font-semibold text-foreground">{prefix}{Number(payload[0].value).toLocaleString('en-IN')}</p>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, hasRole } = useAuth();
  const navigate          = useNavigate();
  const today             = formatDate(new Date(), 'EEEE, dd MMMM yyyy');
  const isDoctor          = user?.role === 'Doctor';

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getSummary()
      .then((res) => setSummary(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visibleActions = QUICK_ACTIONS.filter((a) =>
    hasRole(...(a.roles as ('ClinicAdmin' | 'Doctor' | 'Receptionist' | 'Pharmacist')[]))
  );

  const isPharmacist  = user?.role === 'Pharmacist';
  const canSeeRevenue = !isPharmacist;

  // ── Stat card definitions ─────────────────────────────────────────────────
  const appt = summary?.todayAppointments;
  const waiting   = (appt?.scheduled ?? 0) + (appt?.confirmed ?? 0);
  const active    = appt?.inProgress ?? 0;
  const completed = appt?.completed  ?? 0;

  const apptLabel = isDoctor ? 'My Appointments Today' : "Today's Appointments";

  const statCards = [
    {
      label: apptLabel,
      value: loading ? '—' : String(appt?.total ?? 0),
      sub:   loading ? '' : `${completed} completed · ${waiting + active} remaining`,
      icon:  Calendar,
      color: 'text-violet-600',
      bg:    'bg-violet-50',
      href:  '/appointments',
      show:  true,
    },
    {
      label: isDoctor ? 'Patients Seen Today' : 'Patients Seen Today',
      value: loading ? '—' : String(summary?.patientsSeenToday ?? 0),
      sub:   loading ? '' : `from ${completed} completed appointment${completed !== 1 ? 's' : ''}`,
      icon:  Users,
      color: 'text-teal-600',
      bg:    'bg-teal-50',
      href:  '/appointments',
      show:  true,
    },
    {
      label: 'Pending Lab Reports',
      value: loading ? '—' : String(summary?.pendingLabReports ?? 0),
      sub:   loading ? '' : (summary?.pendingLabReports ?? 0) === 0
               ? 'All reports up to date'
               : 'Ordered · Processing · Sample pending',
      icon:  FlaskConical,
      color: 'text-blue-600',
      bg:    'bg-blue-50',
      href:  '/lab',
      show:  !isPharmacist,
    },
    {
      label: 'Low Stock Items',
      value: loading ? '—' : String(summary?.lowStockCount ?? 0),
      sub:   loading ? '' : summary?.outOfStockCount
               ? `${summary.outOfStockCount} out of stock`
               : 'Check pharmacy inventory',
      icon:  Package,
      color: (summary?.lowStockCount ?? 0) > 0 ? 'text-orange-600' : 'text-emerald-600',
      bg:    (summary?.lowStockCount ?? 0) > 0 ? 'bg-orange-50' : 'bg-emerald-50',
      href:  '/pharmacy?lowStock=1',
      show:  true,
    },
    {
      label: 'Revenue This Month',
      value: loading ? '—' : fmt(summary?.monthRevenue ?? 0),
      sub:   loading ? '' : `Today: ${fmt(summary?.todayRevenue ?? 0)}`,
      icon:  CreditCard,
      color: 'text-green-600',
      bg:    'bg-green-50',
      href:  '/billing',
      show:  canSeeRevenue,
    },
  ].filter((c) => c.show);

  const cols = statCards.length <= 4 ? `grid-cols-2 md:grid-cols-${statCards.length}` : 'grid-cols-2 md:grid-cols-5';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Good {getGreeting()}, {user?.name?.split(' ')[0]}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {today}
          </p>
        </div>
        <Badge variant="success" className="hidden sm:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1.5" />
          Clinic Active
        </Badge>
      </div>

      {/* ── Alerts ───────────────────────────────────────────────────────── */}
      {!loading && (summary?.lowStockCount ?? 0) > 0 && (
        <button
          className="w-full flex items-center gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-left text-sm text-orange-800 hover:bg-orange-100 transition-colors"
          onClick={() => navigate('/pharmacy?lowStock=1')}
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-orange-500" />
          <span className="flex-1 font-medium">
            {summary!.lowStockCount} item{summary!.lowStockCount !== 1 ? 's' : ''} below reorder level
            {summary!.outOfStockCount > 0 && ` — ${summary!.outOfStockCount} out of stock`}
          </span>
          <ChevronRight className="h-4 w-4 text-orange-400" />
        </button>
      )}

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className={`grid gap-4 ${cols}`}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <StatSkeleton key={i} />)
          : statCards.map((stat) => (
              <Card
                key={stat.label}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(stat.href)}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-muted-foreground leading-tight">{stat.label}</p>
                    <div className={`h-8 w-8 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                </CardContent>
              </Card>
            ))
        }
      </div>

      {/* ── Today's appointment breakdown bar ────────────────────────────── */}
      {!loading && summary && summary.todayAppointments.total > 0 && (
        <Card className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate('/appointments')}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {isDoctor ? 'My Queue Today' : "Today's Queue"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {([
                ['scheduled',   summary.todayAppointments.scheduled,   'bg-gray-100 text-gray-700'],
                ['confirmed',   summary.todayAppointments.confirmed,   'bg-blue-100 text-blue-700'],
                ['in_progress', summary.todayAppointments.inProgress,  'bg-amber-100 text-amber-700'],
                ['completed',   summary.todayAppointments.completed,   'bg-green-100 text-green-700'],
                ['cancelled',   summary.todayAppointments.cancelled,   'bg-red-100 text-red-600'],
              ] as const).filter(([, count]) => count > 0).map(([status, count, cls]) => (
                <span
                  key={status}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cls}`}
                >
                  <span className="font-bold">{count}</span>
                  {APPT_STATUS_LABEL[status]}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Upcoming appointments ────────────────────────────────────────── */}
      {!loading && summary && summary.upcomingAppointments.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {isDoctor ? 'My Upcoming Patients' : 'Upcoming Today'}
            </CardTitle>
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => navigate('/appointments')}
            >
              View all
            </button>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {summary.upcomingAppointments.map((appt) => (
                <li
                  key={appt._id}
                  className="flex items-center justify-between px-6 py-3 hover:bg-muted/40 cursor-pointer transition-colors"
                  onClick={() => navigate('/appointments')}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{appt.tokenDisplay}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{appt.patient.name}</p>
                      <p className="text-xs text-muted-foreground">Dr. {appt.doctor.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{appt.slotStart}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${APPT_STATUS_BADGE[appt.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {APPT_STATUS_LABEL[appt.status] ?? appt.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── Weekly trend charts ──────────────────────────────────────────── */}
      {!loading && summary && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              7-Day Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`grid gap-6 ${canSeeRevenue ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {/* Appointments trend */}
              <div>
                <p className="text-xs font-medium text-foreground mb-2">
                  {isDoctor ? 'My Appointments' : 'Appointments'}
                </p>
                <ResponsiveContainer width="100%" height={110}>
                  <BarChart data={summary.weeklyAppointments} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                    <XAxis
                      dataKey="date"
                      tickFormatter={fmtDay}
                      tick={{ fontSize: 10, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RTooltip content={<MiniTooltip />} cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Revenue trend */}
              {canSeeRevenue && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-2">Revenue (₹)</p>
                  <ResponsiveContainer width="100%" height={110}>
                    <BarChart data={summary.weeklyRevenue} margin={{ top: 2, right: 4, left: -28, bottom: 0 }}>
                      <XAxis
                        dataKey="date"
                        tickFormatter={fmtDay}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RTooltip content={<MiniTooltip prefix="₹" />} cursor={{ fill: '#f1f5f9' }} />
                      <Bar dataKey="revenue" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Pending bills alert ──────────────────────────────────────────── */}
      {!loading && canSeeRevenue && (summary?.pendingBillsCount ?? 0) > 0 && (
        <button
          className="w-full flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-800 hover:bg-amber-100 transition-colors"
          onClick={() => navigate('/billing')}
        >
          <CreditCard className="h-4 w-4 shrink-0 text-amber-500" />
          <span className="flex-1 font-medium">
            {summary!.pendingBillsCount} invoice{summary!.pendingBillsCount !== 1 ? 's' : ''} with outstanding balance
          </span>
          <ChevronRight className="h-4 w-4 text-amber-400" />
        </button>
      )}

      {/* ── Quick actions ────────────────────────────────────────────────── */}
      {visibleActions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {visibleActions.map((action) => (
              <Card
                key={action.label}
                className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
                onClick={() => navigate(action.href)}
              >
                <CardContent className="pt-5 pb-4 text-center">
                  <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center mx-auto mb-2">
                    <action.icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-foreground">{action.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Pharmacist summary ───────────────────────────────────────────── */}
      {isPharmacist && !loading && (
        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-100">
          <CardContent className="pt-5 pb-4 flex items-center gap-4">
            <CheckCircle2 className="h-8 w-8 text-orange-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-800">Pharmacy summary</p>
              <p className="text-xs text-orange-700 mt-0.5">
                {summary?.lowStockCount ?? 0} items at/below reorder level
                {summary?.outOfStockCount ? ` · ${summary.outOfStockCount} out of stock` : ''}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
