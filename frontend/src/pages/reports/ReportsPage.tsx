import { useEffect, useState, useCallback, useRef } from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, Users, Calendar, Package, IndianRupee, AlertTriangle, Download, FileText, Printer, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAppSelector } from '@/app/hooks';
import {
  reportsApi,
  type ReportPeriod,
  type RevenueReport,
  type PatientsReport,
  type AppointmentsReport,
  type InventoryReport,
} from '@/services/reports.service';
import { downloadCsv, printReportAsPdf } from '@/lib/exportUtils';

// ── Palette ──────────────────────────────────────────────────────────────────
const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const PIE_LABEL = ({ name, percent }: { name: string; percent: number }) =>
  percent > 0.04 ? `${name} ${(percent * 100).toFixed(0)}%` : '';

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function pct(n: number) { return `${n}%`; }

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  week:    'This Week',
  month:   'This Month',
  quarter: 'This Quarter',
  year:    'This Year',
};

const APPT_STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled', confirmed: 'Confirmed',
  in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled',
};

const CATEGORY_LABEL: Record<string, string> = {
  medicine: 'Medicine', consumable: 'Consumable', equipment: 'Equipment',
  supplement: 'Supplement', other: 'Other',
};

const MODE_LABEL: Record<string, string> = {
  cash: 'Cash', card: 'Card', upi: 'UPI', netbanking: 'Net Banking',
  cheque: 'Cheque', other: 'Other',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, sub, icon: Icon, color, bg,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Loading() {
  return (
    <div className="flex justify-center items-center py-20">
      <Spinner size="lg" />
    </div>
  );
}

function TableHeader({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr className="border-b border-border bg-muted/30">
        {cols.map((c) => (
          <th key={c} className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">{c}</th>
        ))}
      </tr>
    </thead>
  );
}

// ── Revenue Tab ───────────────────────────────────────────────────────────────

function RevenueTab({ period }: { period: ReportPeriod }) {
  const [data, setData]     = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    reportsApi.revenue(period)
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;
  if (!data)   return null;

  const { summary, monthlyTrend, byPaymentMode, topServices } = data;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Billed"      value={fmt(summary.totalBilled)}      icon={IndianRupee} color="text-violet-600" bg="bg-violet-50" sub={`${summary.invoiceCount} invoices`} />
        <SummaryCard label="Total Collected"   value={fmt(summary.totalCollected)}   icon={TrendingUp}  color="text-green-600"  bg="bg-green-50"  />
        <SummaryCard label="Outstanding"       value={fmt(summary.totalOutstanding)} icon={AlertTriangle} color="text-orange-600" bg="bg-orange-50" />
        <SummaryCard label="Collection Rate"   value={summary.totalBilled > 0 ? pct(Math.round(summary.totalCollected / summary.totalBilled * 100)) : '—'} icon={TrendingUp} color="text-blue-600" bg="bg-blue-50" />
      </div>

      {/* Monthly trend */}
      <ChartCard title="Monthly Revenue Trend (12 months)">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthlyTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gBilled" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gCollected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="billed"    name="Billed"    stroke="#6366f1" fill="url(#gBilled)"    strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="collected" name="Collected" stroke="#10b981" fill="url(#gCollected)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Payment mode breakdown */}
        {byPaymentMode.length > 0 && (
          <ChartCard title="By Payment Mode">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={byPaymentMode.map((m) => ({ name: MODE_LABEL[m.mode] ?? m.mode, value: m.amount }))}
                  cx="50%" cy="50%" outerRadius={70}
                  dataKey="value" labelLine={false} label={PIE_LABEL}
                >
                  {byPaymentMode.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Top services */}
        {topServices.length > 0 && (
          <ChartCard title="Top Services by Revenue">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <TableHeader cols={['Service', 'Type', 'Qty', 'Revenue']} />
                <tbody>
                  {topServices.map((s, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-2 px-3 font-medium max-w-[150px] truncate">{s.description}</td>
                      <td className="py-2 px-3 capitalize text-muted-foreground">{s.type}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{s.count}</td>
                      <td className="py-2 px-3 text-right font-semibold">{fmt(s.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        )}
      </div>
    </div>
  );
}

// ── Patients Tab ──────────────────────────────────────────────────────────────

function PatientsTab({ period }: { period: ReportPeriod }) {
  const [data, setData]       = useState<PatientsReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    reportsApi.patients(period)
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;
  if (!data)   return null;

  const { summary, monthlyNewPatients, byGender, byDoctor } = data;
  const total = byGender.reduce((s, g) => s + g.count, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Patients"      value={String(summary.total)}         icon={Users} color="text-blue-600"   bg="bg-blue-50"   />
        <SummaryCard label="New This Period"      value={String(summary.newThisPeriod)} icon={Users} color="text-green-600"  bg="bg-green-50"  />
        {byGender.map((g) => (
          <SummaryCard key={g.gender}
            label={g.gender.charAt(0).toUpperCase() + g.gender.slice(1)}
            value={String(g.count)}
            sub={total > 0 ? pct(Math.round(g.count / total * 100)) : undefined}
            icon={Users}
            color={g.gender === 'male' ? 'text-blue-600' : g.gender === 'female' ? 'text-pink-600' : 'text-gray-600'}
            bg={g.gender === 'male' ? 'bg-blue-50' : g.gender === 'female' ? 'bg-pink-50' : 'bg-gray-50'}
          />
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <ChartCard title="New Patients per Month (12 months)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyNewPatients} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="count" name="New Patients" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {byGender.length > 0 && (
          <ChartCard title="Gender Distribution">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={byGender.map((g) => ({ name: g.gender.charAt(0).toUpperCase() + g.gender.slice(1), value: g.count }))}
                  cx="50%" cy="50%" outerRadius={80}
                  dataKey="value" labelLine={false} label={PIE_LABEL}
                >
                  {byGender.map((g, i) => (
                    <Cell key={i} fill={g.gender === 'male' ? '#6366f1' : g.gender === 'female' ? '#ec4899' : '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {byDoctor.length > 0 && (
        <ChartCard title="Doctor-wise Activity">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <TableHeader cols={['Doctor', 'Appointments', 'Unique Patients', 'Completed', 'Completion %']} />
              <tbody>
                {byDoctor.map((d) => (
                  <tr key={d.doctorId} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-2 px-3 font-medium">{d.name}</td>
                    <td className="py-2 px-3 text-right">{d.appointments}</td>
                    <td className="py-2 px-3 text-right">{d.uniquePatients}</td>
                    <td className="py-2 px-3 text-right text-green-700">{d.completed}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">
                      {d.appointments > 0 ? pct(Math.round(d.completed / d.appointments * 100)) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}
    </div>
  );
}

// ── Appointments Tab ──────────────────────────────────────────────────────────

function AppointmentsTab({ period }: { period: ReportPeriod }) {
  const [data, setData]       = useState<AppointmentsReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    reportsApi.appointments(period)
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;
  if (!data)   return null;

  const { summary, dailyTrend, byStatus, byVisitType, byDoctor } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total"           value={String(summary.total)}          icon={Calendar} color="text-violet-600" bg="bg-violet-50" />
        <SummaryCard label="Completed"       value={String(summary.completed)}      icon={Calendar} color="text-green-600"  bg="bg-green-50"  />
        <SummaryCard label="Cancelled"       value={String(summary.cancelled)}      icon={Calendar} color="text-red-600"    bg="bg-red-50"    />
        <SummaryCard label="Completion Rate" value={pct(summary.completionRate)}    icon={TrendingUp} color="text-blue-600" bg="bg-blue-50"   />
      </div>

      {dailyTrend.length > 0 && (
        <ChartCard title="Daily Appointments">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false}
                interval={dailyTrend.length > 14 ? Math.floor(dailyTrend.length / 10) : 0} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="total"     name="Total"     fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={30} />
              <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {byStatus.length > 0 && (
          <ChartCard title="By Status">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={byStatus.map((s) => ({ name: APPT_STATUS_LABEL[s.status] ?? s.status, value: s.count }))}
                  cx="50%" cy="50%" outerRadius={75}
                  dataKey="value" labelLine={false} label={PIE_LABEL}
                >
                  {byStatus.map((s, i) => {
                    const c = s.status === 'completed' ? '#10b981' : s.status === 'cancelled' ? '#ef4444' : s.status === 'in_progress' ? '#f59e0b' : COLORS[i % COLORS.length];
                    return <Cell key={i} fill={c} />;
                  })}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {byVisitType.length > 0 && (
          <ChartCard title="New vs Follow-up">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={byVisitType.map((v) => ({ name: v.visitType === 'new' ? 'New Visit' : 'Follow-up', value: v.count }))}
                  cx="50%" cy="50%" outerRadius={75}
                  dataKey="value" labelLine={false} label={PIE_LABEL}
                >
                  <Cell fill="#6366f1" />
                  <Cell fill="#06b6d4" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {byDoctor.length > 0 && (
        <ChartCard title="Doctor-wise Appointments">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <TableHeader cols={['Doctor', 'Total', 'Completed', 'Cancelled', 'Rate']} />
              <tbody>
                {byDoctor.map((d) => (
                  <tr key={d.doctorId} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-2 px-3 font-medium">{d.name}</td>
                    <td className="py-2 px-3 text-right">{d.total}</td>
                    <td className="py-2 px-3 text-right text-green-700">{d.completed}</td>
                    <td className="py-2 px-3 text-right text-red-600">{d.cancelled}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">
                      {d.total > 0 ? pct(Math.round(d.completed / d.total * 100)) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}
    </div>
  );
}

// ── Inventory Tab ─────────────────────────────────────────────────────────────

function InventoryTab() {
  const [data, setData]       = useState<InventoryReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsApi.inventory()
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!data)   return null;

  const { summary, byCategory, lowStockItems, nearExpiryBatches } = data;

  const daysToExpiry = (iso: string) => {
    const diff = new Date(iso).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard label="Total Items"    value={String(summary.totalItems)}      icon={Package}      color="text-blue-600"   bg="bg-blue-50"   />
        <SummaryCard label="Inventory Value" value={fmt(summary.totalValue)}        icon={IndianRupee}  color="text-green-600"  bg="bg-green-50"  />
        <SummaryCard label="Low Stock"       value={String(summary.lowStockCount)}  icon={AlertTriangle} color="text-orange-600" bg="bg-orange-50" />
        <SummaryCard label="Out of Stock"    value={String(summary.outOfStockCount)} icon={AlertTriangle} color="text-red-600"   bg="bg-red-50"    />
        <SummaryCard label="Near Expiry"     value={String(summary.nearExpiryCount)} icon={AlertTriangle} color="text-amber-600" bg="bg-amber-50"  sub="within 60 days" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {byCategory.length > 0 && (
          <ChartCard title="Stock by Category">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={byCategory.map((c) => ({ name: CATEGORY_LABEL[c.category] ?? c.category, value: c.count }))}
                  cx="50%" cy="50%" outerRadius={80}
                  dataKey="value" labelLine={false} label={PIE_LABEL}
                >
                  {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {byCategory.length > 0 && (
          <ChartCard title="Inventory Value by Category">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={byCategory.map((c) => ({ name: CATEGORY_LABEL[c.category] ?? c.category, value: c.value }))}
                margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="value" name="Value" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {lowStockItems.length > 0 && (
        <ChartCard title={`Low Stock Items (${lowStockItems.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <TableHeader cols={['Drug / Item', 'Category', 'Current Stock', 'Reorder Level', 'Unit']} />
              <tbody>
                {lowStockItems.map((item) => (
                  <tr key={item._id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-2 px-3 font-medium">{item.name}</td>
                    <td className="py-2 px-3 capitalize text-muted-foreground">{item.category}</td>
                    <td className={`py-2 px-3 text-right font-semibold ${item.currentStock === 0 ? 'text-red-600' : 'text-orange-600'}`}>
                      {item.currentStock}
                    </td>
                    <td className="py-2 px-3 text-right text-muted-foreground">{item.reorderLevel}</td>
                    <td className="py-2 px-3 text-muted-foreground">{item.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {nearExpiryBatches.length > 0 && (
        <ChartCard title={`Near-Expiry Batches (${nearExpiryBatches.length})`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <TableHeader cols={['Drug / Item', 'Batch No.', 'Expiry Date', 'Days Left', 'Qty']} />
              <tbody>
                {nearExpiryBatches.map((b) => {
                  const days = daysToExpiry(b.expiryDate);
                  return (
                    <tr key={`${b._id}-${b.batchNumber}`} className="border-b border-border/50 hover:bg-muted/20">
                      <td className="py-2 px-3 font-medium">{b.name}</td>
                      <td className="py-2 px-3 font-mono text-muted-foreground">{b.batchNumber}</td>
                      <td className="py-2 px-3 text-muted-foreground">
                        {new Date(b.expiryDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className={`py-2 px-3 text-right font-semibold ${days <= 7 ? 'text-red-600' : days <= 30 ? 'text-orange-600' : 'text-amber-600'}`}>
                        {days}d
                      </td>
                      <td className="py-2 px-3 text-right">{b.quantity}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PERIODS: ReportPeriod[] = ['week', 'month', 'quarter', 'year'];

const TAB_TITLE: Record<string, string> = {
  revenue:      'Revenue',
  patients:     'Patients',
  appointments: 'Appointments',
  inventory:    'Inventory',
};

export default function ReportsPage() {
  const { user }   = useAuth();
  const clinic     = useAppSelector((s) => s.clinic.clinic);
  const role       = user?.role ?? '';

  const isAdmin      = role === 'ClinicAdmin';
  const isDoctor     = role === 'Doctor' || role === 'ClinicAdmin';
  const isReception  = role === 'Receptionist';
  const isPharmacist = role === 'Pharmacist';

  // Determine available tabs based on role
  const tabs = [
    { id: 'revenue',      label: 'Revenue',      show: isAdmin || isReception },
    { id: 'patients',     label: 'Patients',     show: isAdmin || isDoctor || isReception },
    { id: 'appointments', label: 'Appointments', show: isAdmin || isDoctor || isReception },
    { id: 'inventory',    label: 'Inventory',    show: isAdmin || isPharmacist },
  ].filter((t) => t.show);

  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? 'patients');
  const [period, setPeriod]       = useState<ReportPeriod>('month');

  // ── Export ────────────────────────────────────────────────────────────────
  const [exportOpen, setExportOpen]   = useState(false);
  const [exporting, setExporting]     = useState(false);
  const exportRef                     = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExportOpen(false);
    setExporting(true);
    try {
      const exportPeriod = activeTab !== 'inventory' ? period : undefined;
      const res = await reportsApi.export(activeTab, exportPeriod);
      const { headers, rows } = res.data.data;

      const periodLabel = exportPeriod ? PERIOD_LABELS[exportPeriod].toLowerCase().replace(/\s+/g, '-') : 'all';
      const dateStr     = new Date().toISOString().slice(0, 10);
      const filename    = `${activeTab}-report-${periodLabel}-${dateStr}`;
      const clinicName  = clinic?.name ?? 'Clinic';
      const subtitle    = activeTab !== 'inventory'
        ? `Period: ${PERIOD_LABELS[exportPeriod!]}`
        : 'Snapshot: All active items';

      if (format === 'csv') {
        downloadCsv(`${filename}.csv`, headers, rows);
      } else {
        printReportAsPdf({
          clinicName,
          title:    `${TAB_TITLE[activeTab]} Report`,
          subtitle,
          headers,
          rows,
        });
      }
    } catch {
      // silent — could add toast here if desired
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Clinic performance overview</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Period selector — hidden for inventory tab (snapshot, no period) */}
          {activeTab !== 'inventory' && (
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    period === p
                      ? 'bg-white text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          )}

          {/* Export dropdown */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportOpen((o) => !o)}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-foreground shadow-sm hover:bg-muted/50 transition-colors disabled:opacity-60"
            >
              {exporting
                ? <Spinner className="h-3.5 w-3.5" />
                : <Download className="h-3.5 w-3.5" />}
              Export
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>

            {exportOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-20 min-w-[168px] rounded-md border border-border bg-white shadow-lg overflow-hidden">
                <button
                  onClick={() => handleExport('csv')}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors"
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Download CSV</span>
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors border-t border-border/50"
                >
                  <Printer className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Print / Save PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <RadixTabs.Root value={activeTab} onValueChange={setActiveTab}>
        <RadixTabs.List className="flex gap-1 border-b border-border mb-6">
          {tabs.map((tab) => (
            <RadixTabs.Trigger
              key={tab.id}
              value={tab.id}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors
                         border-b-2 border-transparent -mb-px
                         data-[state=active]:text-primary data-[state=active]:border-primary"
            >
              {tab.label}
            </RadixTabs.Trigger>
          ))}
        </RadixTabs.List>

        <RadixTabs.Content value="revenue">
          <RevenueTab period={period} />
        </RadixTabs.Content>
        <RadixTabs.Content value="patients">
          <PatientsTab period={period} />
        </RadixTabs.Content>
        <RadixTabs.Content value="appointments">
          <AppointmentsTab period={period} />
        </RadixTabs.Content>
        <RadixTabs.Content value="inventory">
          <InventoryTab />
        </RadixTabs.Content>
      </RadixTabs.Root>
    </div>
  );
}
