import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Users, Calendar, TrendingUp,
  AlertTriangle, Clock, CheckCircle, XCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { superadminApi } from '@/services/superadmin.service';
import type { PlatformAnalytics } from '@/services/superadmin.service';
import { getErrorMessage } from '@/lib/utils';

// ── Helpers ────────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  trial:        '#a78bfa',
  basic:        '#60a5fa',
  professional: '#34d399',
  enterprise:   '#f59e0b',
};

const PLAN_LABELS: Record<string, string> = {
  trial: 'Trial', basic: 'Basic', professional: 'Professional', enterprise: 'Enterprise',
};

const STATUS_COLORS: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  trial:     'bg-violet-100 text-violet-700',
  expired:   'bg-red-100 text-red-700',
  suspended: 'bg-orange-100 text-orange-700',
  inactive:  'bg-gray-100 text-gray-600',
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, color, sub,
}: {
  label: string; value: number | string; icon: React.ElementType;
  color: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-4">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground font-medium mt-0.5">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [data, setData]       = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    superadminApi.getAnalytics()
      .then((r) => setData(r.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (error)   return <Alert variant="error">{error}</Alert>;
  if (!data)   return null;

  const { clinics, patients, appointments, planDistribution, recentClinics } = data;

  const chartData = planDistribution.map((p) => ({
    name:  PLAN_LABELS[p.plan] ?? p.plan,
    count: p.count,
    fill:  PLAN_COLORS[p.plan] ?? '#94a3b8',
  }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Platform Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Real-time overview of all clinics on ClinixIndia</p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Clinics"       value={clinics.total}   icon={Building2}    color="bg-violet-100 text-violet-600" />
        <StatCard label="Active Clinics"      value={clinics.active}  icon={CheckCircle}  color="bg-emerald-100 text-emerald-600" />
        <StatCard label="Total Patients"      value={patients}        icon={Users}        color="bg-blue-100 text-blue-600" />
        <StatCard label="Total Appointments"  value={appointments}    icon={Calendar}     color="bg-amber-100 text-amber-600" />
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-violet-500 shrink-0" />
          <div>
            <p className="text-lg font-bold text-foreground">{clinics.trial}</p>
            <p className="text-xs text-muted-foreground">On Trial</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <div>
            <p className="text-lg font-bold text-foreground">{clinics.expired}</p>
            <p className="text-xs text-muted-foreground">Expired</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <XCircle className="h-5 w-5 text-orange-500 shrink-0" />
          <div>
            <p className="text-lg font-bold text-foreground">{clinics.suspended}</p>
            <p className="text-xs text-muted-foreground">Suspended</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan distribution chart */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Plan Distribution</h2>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} barSize={36}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(v: number) => [v, 'Clinics']}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-10 text-center">No data yet</p>
          )}
        </div>

        {/* Recent clinics */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Recently Registered</h2>
            </div>
            <Link to="/admin/clinics" className="text-xs text-primary hover:underline">View all</Link>
          </div>

          {recentClinics.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No clinics yet</p>
          ) : (
            <div className="space-y-3">
              {recentClinics.map((c) => (
                <Link
                  key={c._id}
                  to={`/admin/clinics/${c._id}`}
                  className="flex items-center justify-between gap-3 rounded-lg p-2.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.type} · {fmt(c.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      STATUS_COLORS[c.subscription.plan] ?? 'bg-gray-100 text-gray-600'
                    }`}>
                      {PLAN_LABELS[c.subscription.plan] ?? c.subscription.plan}
                    </span>
                    {!c.isActive && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                        Inactive
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
