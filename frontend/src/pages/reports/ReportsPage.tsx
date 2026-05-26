import { useEffect, useState, useCallback, useRef } from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, Users, Calendar, Package, IndianRupee, AlertTriangle, Download, FileText, Printer, ChevronDown, Banknote, Smartphone, CreditCard, Building2, Shield, Search } from 'lucide-react';
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
  type DayEndReport,
  type GstReport,
  type DoctorPerformanceReport,
  type InventoryValuationReport,
  type InventoryValuationItem,
  type OpdRegister,
  type OpdRegisterRow,
} from '@/services/reports.service';
import { usersApi } from '@/services/auth.service';
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

// ── Day-End Report Tab ────────────────────────────────────────────────────────

const DAY_END_MODES: { key: string; label: string; icon: React.ElementType; color: string; bg: string; border: string }[] = [
  { key: 'cash',       label: 'Cash',        icon: Banknote,   color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  { key: 'upi',        label: 'UPI',         icon: Smartphone, color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  { key: 'card',       label: 'Card',        icon: CreditCard, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  { key: 'netbanking', label: 'Net Banking', icon: Building2,  color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { key: 'insurance',  label: 'Insurance',   icon: Shield,     color: 'text-teal-700',   bg: 'bg-teal-50',   border: 'border-teal-200' },
  { key: 'other',      label: 'Other',       icon: Package,    color: 'text-gray-700',   bg: 'bg-gray-50',   border: 'border-gray-200' },
];

function todayIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function DayEndTab() {
  const [date, setDate]       = useState(todayIST);
  const [data, setData]       = useState<DayEndReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    reportsApi.dayEnd(date)
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <div className="space-y-5">
      {/* Controls — hidden during print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground">Date</label>
          <input
            type="date"
            value={date}
            max={todayIST()}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 rounded-md border border-input px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-muted/50 transition-colors"
        >
          <Printer className="h-3.5 w-3.5" />
          Print
        </button>
      </div>

      {loading ? <Loading /> : !data ? (
        <p className="text-center text-sm text-muted-foreground py-12">Failed to load report.</p>
      ) : (
        <div id="day-end-report" className="space-y-6">
          {/* Print-only header */}
          <div className="hidden print:block text-center pb-4 border-b border-gray-300">
            <h2 className="text-xl font-bold">Day End Cash Report</h2>
            <p className="text-sm text-gray-500 mt-1">{dateLabel}</p>
          </div>

          {/* Mode summary */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Collection by Mode</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
              {DAY_END_MODES.map(({ key, label, icon: Icon, color, bg, border }) => {
                const m = data.byMode.find((x) => x.mode === key);
                return (
                  <div key={key} className={`rounded-xl border ${border} ${bg} p-3`}>
                    <div className={`flex items-center gap-1.5 ${color} mb-1`}>
                      <Icon className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">{label}</span>
                    </div>
                    <p className={`text-lg font-bold ${color}`}>
                      {m ? `₹${m.amount.toFixed(0)}` : '—'}
                    </p>
                    {m && (
                      <p className="text-xs text-muted-foreground">{m.count} txn{m.count !== 1 ? 's' : ''}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Grand total bar */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Grand Total Collected</p>
                <p className="text-2xl font-bold text-primary">₹{data.totalAmount.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground font-medium">Transactions</p>
                <p className="text-2xl font-bold text-foreground">{data.totalCount}</p>
              </div>
            </div>
          </div>

          {/* Transaction list */}
          {data.transactions.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">All Transactions</p>
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <TableHeader cols={['Time (IST)', 'Patient', 'Invoice', 'Mode', 'Ref. No.', 'Amount']} />
                  <tbody className="divide-y divide-border">
                    {data.transactions.map((txn, i) => {
                      const mCfg = DAY_END_MODES.find((m) => m.key === txn.mode) ?? DAY_END_MODES[5];
                      return (
                        <tr key={i} className="hover:bg-muted/20">
                          <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(txn.paidAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                          </td>
                          <td className="py-2 px-3 font-medium">{txn.patientName}</td>
                          <td className="py-2 px-3 font-mono text-xs text-primary">{txn.invoiceNumber}</td>
                          <td className="py-2 px-3">
                            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${mCfg.bg} ${mCfg.color} ${mCfg.border}`}>
                              {mCfg.label}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-xs text-muted-foreground font-mono">
                            {txn.transactionId || '—'}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold">₹{txn.amount.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                      <td colSpan={5} className="py-2.5 px-3 text-sm text-right">Total</td>
                      <td className="py-2.5 px-3 text-right text-primary font-bold">₹{data.totalAmount.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-muted-foreground">
              No payments collected on {dateLabel}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── GST Report Tab ────────────────────────────────────────────────────────────

function currentMonthIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }).slice(0, 7);
}

function fmtMonthLabel(ym: string) {
  return new Date(ym + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

const GST_CSV_HEADERS = [
  'HSN Code', 'GST Rate (%)', 'Taxable Value (₹)',
  'CGST (₹)', 'SGST (₹)', 'IGST (₹)', 'Total Tax (₹)', 'Invoice Amount (₹)', 'Item Count',
];

function gstRows(data: GstReport): (string | number)[][] {
  return data.rows.map((r) => [
    r.hsnCode || 'N/A',
    r.gstRate,
    r.taxableValue.toFixed(2),
    r.cgstAmount.toFixed(2),
    r.sgstAmount.toFixed(2),
    r.igstAmount.toFixed(2),
    r.totalTax.toFixed(2),
    r.totalAmount.toFixed(2),
    r.itemCount,
  ]);
}

function GstReportTab() {
  const clinic = useAppSelector((s) => s.clinic.clinic);
  const [month, setMonth]     = useState(currentMonthIST);
  const [data, setData]       = useState<GstReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    reportsApi.gstReport(month)
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const handleCsvExport = () => {
    if (!data) return;
    const rows = gstRows(data);
    // Totals row
    const { summary: s } = data;
    rows.push([
      'TOTAL', '',
      s.taxableValue.toFixed(2),
      s.cgstAmount.toFixed(2),
      s.sgstAmount.toFixed(2),
      s.igstAmount.toFixed(2),
      s.totalTax.toFixed(2),
      s.totalAmount.toFixed(2),
      '',
    ]);
    downloadCsv(`GST-Report-${month}.csv`, GST_CSV_HEADERS, rows);
  };

  const handlePrint = () => {
    if (!data) return;
    const rows = gstRows(data);
    const { summary: s } = data;
    rows.push([
      'TOTAL', '',
      s.taxableValue.toFixed(2),
      s.cgstAmount.toFixed(2),
      s.sgstAmount.toFixed(2),
      s.igstAmount.toFixed(2),
      s.totalTax.toFixed(2),
      s.totalAmount.toFixed(2),
      '',
    ]);
    printReportAsPdf({
      clinicName: clinic?.name ?? 'Clinic',
      title:      'GST Report (GSTR-1 Style)',
      subtitle:   `Month: ${fmtMonthLabel(month)} · ${data.invoiceCount} invoice${data.invoiceCount !== 1 ? 's' : ''}`,
      headers:    GST_CSV_HEADERS,
      rows,
    });
  };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground">Month</label>
          <input
            type="month"
            value={month}
            max={currentMonthIST()}
            onChange={(e) => setMonth(e.target.value)}
            className="h-8 rounded-md border border-input px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {data && (
            <span className="text-xs text-muted-foreground">
              {data.invoiceCount} invoice{data.invoiceCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCsvExport}
            disabled={!data || loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            onClick={handlePrint}
            disabled={!data || loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        </div>
      </div>

      {loading ? <Loading /> : !data ? (
        <p className="text-center text-sm text-muted-foreground py-12">Failed to load GST report.</p>
      ) : data.rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No invoices for {fmtMonthLabel(month)}.</p>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                HSN-wise GST Summary — {fmtMonthLabel(month)}
              </CardTitle>
              <span className="text-xs text-muted-foreground">{data.rows.length} row{data.rows.length !== 1 ? 's' : ''}</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {[
                      'HSN Code', 'GST %', 'Taxable Value',
                      'CGST', 'SGST', 'IGST', 'Total Tax', 'Invoice Amt', 'Items',
                    ].map((h) => (
                      <th key={h} className="text-right first:text-left py-2.5 px-3 font-semibold text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {data.rows.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/20 transition-colors">
                      <td className="py-2 px-3 font-mono font-medium">{r.hsnCode || <span className="text-muted-foreground italic">N/A</span>}</td>
                      <td className="py-2 px-3 text-right">{r.gstRate === 0 ? 'Nil' : `${r.gstRate}%`}</td>
                      <td className="py-2 px-3 text-right font-medium">₹{r.taxableValue.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-blue-700">{r.cgstAmount > 0 ? `₹${r.cgstAmount.toFixed(2)}` : '—'}</td>
                      <td className="py-2 px-3 text-right text-blue-700">{r.sgstAmount > 0 ? `₹${r.sgstAmount.toFixed(2)}` : '—'}</td>
                      <td className="py-2 px-3 text-right text-indigo-700">{r.igstAmount > 0 ? `₹${r.igstAmount.toFixed(2)}` : '—'}</td>
                      <td className="py-2 px-3 text-right font-semibold text-orange-700">₹{r.totalTax.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-semibold">₹{r.totalAmount.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-muted-foreground">{r.itemCount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/40 font-bold">
                    <td className="py-2.5 px-3" colSpan={2}>TOTAL</td>
                    <td className="py-2.5 px-3 text-right">₹{data.summary.taxableValue.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-blue-700">₹{data.summary.cgstAmount.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-blue-700">₹{data.summary.sgstAmount.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-indigo-700">₹{data.summary.igstAmount.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-orange-700">₹{data.summary.totalTax.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right">₹{data.summary.totalAmount.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground">
                      {data.rows.reduce((s, r) => s + r.itemCount, 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      {data && data.rows.length > 0 && (
        <div className="rounded-lg bg-muted/30 border border-border/50 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Notes</p>
          <p>· CGST &amp; SGST apply to intra-state supplies. IGST applies to inter-state supplies.</p>
          <p>· Items without an HSN code are listed as N/A. Assign HSN codes in the invoice line items for complete GSTR-1 compliance.</p>
          <p>· This report covers invoice date within the selected month (IST). Export and verify with your CA before filing.</p>
        </div>
      )}
    </div>
  );
}

// ── Doctor Performance Tab ────────────────────────────────────────────────────

function DoctorPerformanceTab({ period }: { period: ReportPeriod }) {
  const [data, setData]       = useState<DoctorPerformanceReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    reportsApi.doctorPerformance(period)
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;
  if (!data)   return null;

  const { summary, doctors } = data;
  const reversed = [...doctors].reverse();

  const handleCsvExport = () => {
    const headers = [
      'Doctor', 'Consultations', 'Completed', 'Completion Rate (%)',
      'Unique Patients', 'Billed (₹)', 'Collected (₹)', 'Invoices', 'Avg/Patient (₹)',
    ];
    const rows = doctors.map((d) => [
      d.name,
      d.consultations,
      d.completed,
      d.completionRate,
      d.uniquePatients,
      d.revenueBilled.toFixed(2),
      d.revenueCollected.toFixed(2),
      d.invoiceCount,
      d.avgBilledPerPatient.toFixed(2),
    ]);
    downloadCsv(`doctor-performance-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <SummaryCard label="Active Doctors"       value={String(summary.totalDoctors)}       icon={Users}         color="text-blue-600"   bg="bg-blue-50"   />
        <SummaryCard label="Total Consultations"  value={String(summary.totalConsultations)}  icon={Calendar}      color="text-violet-600" bg="bg-violet-50" />
        <SummaryCard label="Total Revenue"        value={fmt(summary.totalRevenue)}           icon={IndianRupee}   color="text-green-600"  bg="bg-green-50"  sub="from linked invoices" />
      </div>

      {doctors.length > 0 && (
        <ChartCard title="Consultations per Doctor">
          <div className="flex justify-end mb-2">
            <button
              onClick={handleCsvExport}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-muted/50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(180, doctors.length * 44)}>
            <BarChart
              data={reversed.map((d) => ({ name: d.name, consultations: d.consultations }))}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 80, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="consultations" name="Consultations" fill="#6366f1" radius={[0, 3, 3, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {doctors.length > 0 && (
        <ChartCard title="Doctor-wise Detail">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <TableHeader cols={['Doctor', 'Consultations', 'Completed', 'Rate', 'Patients', 'Billed', 'Collected', 'Invoices', 'Avg/Patient']} />
              <tbody>
                {doctors.map((d) => (
                  <tr key={d.doctorId} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="py-2 px-3 font-medium">{d.name}</td>
                    <td className="py-2 px-3 text-right">{d.consultations}</td>
                    <td className="py-2 px-3 text-right text-green-700">{d.completed}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">{d.consultations > 0 ? pct(d.completionRate) : '—'}</td>
                    <td className="py-2 px-3 text-right">{d.uniquePatients}</td>
                    <td className="py-2 px-3 text-right font-medium">{d.revenueBilled > 0 ? fmt(d.revenueBilled) : '—'}</td>
                    <td className="py-2 px-3 text-right text-green-700">{d.revenueCollected > 0 ? fmt(d.revenueCollected) : '—'}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">{d.invoiceCount > 0 ? d.invoiceCount : '—'}</td>
                    <td className="py-2 px-3 text-right text-muted-foreground">{d.avgBilledPerPatient > 0 ? fmt(d.avgBilledPerPatient) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3 px-1">
            * Revenue only includes invoices linked to an appointment. Direct invoices are not attributed.
          </p>
        </ChartCard>
      )}
    </div>
  );
}

// ── Inventory Valuation Tab ───────────────────────────────────────────────────

function InventoryValuationTab() {
  const [data, setData]       = useState<InventoryValuationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    reportsApi.inventoryValuation()
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!data)   return null;

  const { summary, byCategory, items, snapshotAt } = data;

  const filtered: InventoryValuationItem[] = search.trim()
    ? items.filter(
        (it) =>
          it.name.toLowerCase().includes(search.toLowerCase()) ||
          it.category.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const filteredTotal = filtered.reduce((s, it) => s + it.stockValue, 0);

  const handleCsvExport = () => {
    const headers = [
      'Item Name', 'Category', 'Stock', 'Unit', 'Selling Price (₹)',
      'Stock Value (₹)', 'Reorder Level', 'Status',
    ];
    const rows = items.map((it) => [
      it.name,
      it.category,
      it.currentStock,
      it.unit,
      it.sellingPrice.toFixed(2),
      it.stockValue.toFixed(2),
      it.reorderLevel,
      it.isOutOfStock ? 'Out of Stock' : it.isLowStock ? 'Low Stock' : 'OK',
    ]);
    downloadCsv(`inventory-valuation-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SummaryCard label="Total SKUs"    value={String(summary.totalSKUs)}       icon={Package}      color="text-blue-600"   bg="bg-blue-50"   />
        <SummaryCard label="Total Units"   value={String(summary.totalUnits)}      icon={Package}      color="text-violet-600" bg="bg-violet-50" sub="in stock" />
        <SummaryCard label="Stock Value"   value={fmt(summary.totalValue)}         icon={IndianRupee}  color="text-green-600"  bg="bg-green-50"  sub="at selling price" />
        <SummaryCard label="In Stock"      value={String(summary.inStockCount)}    icon={Package}      color="text-teal-600"   bg="bg-teal-50"   />
        <SummaryCard label="Out of Stock"  value={String(summary.outOfStockCount)} icon={AlertTriangle} color="text-red-600"   bg="bg-red-50"    />
      </div>

      {byCategory.length > 0 && (
        <ChartCard title="Stock Value by Category">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={byCategory.map((c) => ({ name: CATEGORY_LABEL[c.category] ?? c.category, value: c.totalValue }))}
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

      <ChartCard title="All Items">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 h-8 rounded-md border border-input text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            <span>Snapshot: {new Date(snapshotAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST</span>
            <button
              onClick={handleCsvExport}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 font-medium shadow-sm hover:bg-muted/50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
          <table className="w-full text-xs">
            <TableHeader cols={['Item Name', 'Category', 'Stock', 'Unit', 'Selling Price', 'Stock Value', 'Reorder', 'Status']} />
            <tbody>
              {filtered.map((it) => (
                <tr key={it._id} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="py-2 px-3 font-medium">{it.name}</td>
                  <td className="py-2 px-3 capitalize text-muted-foreground">{CATEGORY_LABEL[it.category] ?? it.category}</td>
                  <td className={`py-2 px-3 text-right font-semibold ${it.isOutOfStock ? 'text-red-600' : it.isLowStock ? 'text-orange-600' : ''}`}>{it.currentStock}</td>
                  <td className="py-2 px-3 text-muted-foreground">{it.unit}</td>
                  <td className="py-2 px-3 text-right">₹{it.sellingPrice.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-semibold">₹{it.stockValue.toFixed(2)}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{it.reorderLevel}</td>
                  <td className="py-2 px-3">
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                      it.isOutOfStock
                        ? 'bg-red-100 text-red-700'
                        : it.isLowStock
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {it.isOutOfStock ? 'Out' : it.isLowStock ? 'Low' : 'OK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                <td colSpan={5} className="py-2 px-3 text-right text-xs">
                  {filtered.length} item{filtered.length !== 1 ? 's' : ''} — Total Value:
                </td>
                <td className="py-2 px-3 text-right text-primary">₹{filteredTotal.toFixed(2)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}

// ── OPD Register Tab ──────────────────────────────────────────────────────────

function fmtAge(dob: string | null, age: number | null, ageUnit: string | null): string {
  if (dob) {
    const diffMs = Date.now() - new Date(dob).getTime();
    const years  = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
    if (years > 0) return `${years}Y`;
    const months = Math.floor(diffMs / (30.44 * 24 * 60 * 60 * 1000));
    return `${months}M`;
  }
  if (age != null) {
    const unit = ageUnit === 'months' ? 'M' : ageUnit === 'days' ? 'D' : 'Y';
    return `${age}${unit}`;
  }
  return '—';
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  scheduled:   { label: 'Scheduled',   dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-700' },
  confirmed:   { label: 'Confirmed',   dot: 'bg-blue-400',   badge: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In Progress', dot: 'bg-amber-400',  badge: 'bg-amber-100 text-amber-700' },
  completed:   { label: 'Completed',   dot: 'bg-green-500',  badge: 'bg-green-100 text-green-700' },
  cancelled:   { label: 'Cancelled',   dot: 'bg-red-400',    badge: 'bg-red-100 text-red-600' },
};

function OpdRegisterTab() {
  const { user } = useAuth();
  const role     = user?.role ?? '';
  const isDoctor = role === 'Doctor';

  const [date, setDate]             = useState(todayIST);
  const [doctorFilter, setDoctorFilter] = useState('');
  const [doctors, setDoctors]       = useState<{ _id: string; name: string }[]>([]);
  const [data, setData]             = useState<OpdRegister | null>(null);
  const [loading, setLoading]       = useState(true);

  // Load doctor list for non-Doctor roles
  useEffect(() => {
    if (!isDoctor) {
      (usersApi.listStaff({ limit: 100 }) as any).then((res: any) => {
        const staff = res?.data?.data ?? [];
        setDoctors(staff.filter((s: any) => s.role === 'Doctor' || s.role === 'ClinicAdmin'));
      }).catch(() => {});
    }
  }, [isDoctor]);

  const load = useCallback(() => {
    setLoading(true);
    reportsApi.opdRegister(date, isDoctor ? undefined : (doctorFilter || undefined))
      .then((res) => setData(res.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [date, doctorFilter, isDoctor]);

  useEffect(() => { load(); }, [load]);

  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const handleCsvExport = () => {
    if (!data) return;
    const headers = [
      'Token', 'Time', 'Patient Name', 'Patient ID', 'Mobile',
      'Age/Sex', 'Doctor', 'Mode', 'Visit Type', 'Chief Complaint',
      'Status', 'Vitals', 'Prescription', 'Invoice',
    ];
    const rows: (string | number)[][] = data.rows.map((row) => [
      row.tokenDisplay,
      row.slotStart,
      row.patientName,
      row.patientId,
      row.mobile,
      `${fmtAge(row.dob, row.age, row.ageUnit)}/${row.gender.charAt(0).toUpperCase()}`,
      row.doctorName,
      row.mode,
      row.visitType,
      row.chiefComplaint,
      row.status,
      row.hasVitals ? 'Yes' : 'No',
      row.hasPrescription ? 'Yes' : 'No',
      row.hasInvoice ? 'Yes' : 'No',
    ]);
    downloadCsv(`opd-register-${date}.csv`, headers, rows);
  };

  const completedCount    = data?.rows.filter((r) => r.status === 'completed').length   ?? 0;
  const inProgressCount   = data?.rows.filter((r) => r.status === 'in_progress').length ?? 0;
  const waitingCount      = data?.rows.filter((r) => r.status === 'scheduled' || r.status === 'confirmed').length ?? 0;

  return (
    <div className="space-y-5">
      {/* Controls — hidden during print */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-muted-foreground">Date</label>
          <input
            type="date"
            value={date}
            max={todayIST()}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 rounded-md border border-input px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {!isDoctor && doctors.length > 0 && (
            <>
              <label className="text-sm font-medium text-muted-foreground">Doctor</label>
              <select
                value={doctorFilter}
                onChange={(e) => setDoctorFilter(e.target.value)}
                className="h-8 rounded-md border border-input px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">All Doctors</option>
                {doctors.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCsvExport}
            disabled={!data || loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-muted/50 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Stats row — hidden during print */}
      {data && (
        <div className="flex flex-wrap items-center gap-4 text-sm print:hidden">
          <span className="font-medium">{data.count} patient{data.count !== 1 ? 's' : ''}</span>
          <span className="text-green-700 font-medium">{completedCount} completed</span>
          <span className="text-amber-700 font-medium">{inProgressCount} in progress</span>
          <span className="text-gray-500">{waitingCount} waiting</span>
        </div>
      )}

      {/* Print-only header */}
      <div className="hidden print:block text-center pb-4 border-b border-gray-300 mb-4">
        <h2 className="text-xl font-bold">OPD Register</h2>
        <p className="text-sm text-gray-500 mt-1">{dateLabel}</p>
      </div>

      {loading ? <Loading /> : !data ? (
        <p className="text-center text-sm text-muted-foreground py-12">Failed to load OPD register.</p>
      ) : data.rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">No appointments found for {dateLabel}.</p>
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <TableHeader cols={['Token', 'Time', 'Patient', 'Age/Sex', 'Doctor', 'Mode', 'Visit', 'Complaint', 'Status', 'V', 'Rx', '₹']} />
                <tbody className="divide-y divide-border/50">
                  {data.rows.map((row: OpdRegisterRow) => {
                    const sc = STATUS_CONFIG[row.status] ?? { label: row.status, dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-700' };
                    const rowBg = row.status === 'in_progress' ? 'bg-amber-50/50' : row.status === 'cancelled' ? 'opacity-50' : '';
                    return (
                      <tr key={row._id} className={`hover:bg-muted/20 ${rowBg}`}>
                        <td className="py-2 px-3 font-mono font-semibold text-primary">{row.tokenDisplay}</td>
                        <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">{row.slotStart}</td>
                        <td className="py-2 px-3">
                          <p className="font-medium">{row.patientName}</p>
                          <p className="text-muted-foreground font-mono">{row.patientId}</p>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {fmtAge(row.dob, row.age, row.ageUnit)}/{row.gender.charAt(0).toUpperCase()}
                        </td>
                        <td className="py-2 px-3">{row.doctorName}</td>
                        <td className="py-2 px-3 capitalize text-muted-foreground">{row.mode}</td>
                        <td className="py-2 px-3 capitalize text-muted-foreground">{row.visitType}</td>
                        <td className="py-2 px-3 max-w-[120px] truncate text-muted-foreground" title={row.chiefComplaint}>{row.chiefComplaint || '—'}</td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium ${sc.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
                            {sc.label}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {row.hasVitals ? <span className="text-green-600 font-bold">✓</span> : <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {row.hasPrescription ? <span className="text-blue-600 font-bold">✓</span> : <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {row.hasInvoice ? <span className="text-violet-600 font-bold">✓</span> : <span className="text-muted-foreground/40">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
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
    { id: 'revenue',      label: 'Revenue',        show: isAdmin || isReception },
    { id: 'patients',     label: 'Patients',       show: isAdmin || isDoctor || isReception },
    { id: 'appointments', label: 'Appointments',   show: isAdmin || isDoctor || isReception },
    { id: 'inventory',    label: 'Inventory',      show: isAdmin || isPharmacist },
    { id: 'day-end',             label: 'Day End Report',     show: isAdmin || isReception },
    { id: 'gst',                label: 'GST Report',         show: isAdmin },
    { id: 'doctor-performance', label: 'Doctor Performance', show: isAdmin },
    { id: 'inventory-valuation', label: 'Inventory Valuation', show: isAdmin || isPharmacist },
    { id: 'opd-register',       label: 'OPD Register',       show: isAdmin || isDoctor || isReception },
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
          {/* Period selector — hidden for inventory, day-end, gst, inventory-valuation, and opd-register tabs */}
          {activeTab !== 'inventory' && activeTab !== 'day-end' && activeTab !== 'gst' && activeTab !== 'inventory-valuation' && activeTab !== 'opd-register' && (
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

          {/* Export dropdown — hidden for day-end, gst, doctor-performance, inventory-valuation, and opd-register (all have their own export buttons) */}
          {activeTab !== 'day-end' && activeTab !== 'gst' && activeTab !== 'doctor-performance' && activeTab !== 'inventory-valuation' && activeTab !== 'opd-register' && <div className="relative" ref={exportRef}>
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
          </div>}
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
        <RadixTabs.Content value="day-end">
          <DayEndTab />
        </RadixTabs.Content>
        <RadixTabs.Content value="gst">
          <GstReportTab />
        </RadixTabs.Content>
        <RadixTabs.Content value="doctor-performance">
          <DoctorPerformanceTab period={period} />
        </RadixTabs.Content>
        <RadixTabs.Content value="inventory-valuation">
          <InventoryValuationTab />
        </RadixTabs.Content>
        <RadixTabs.Content value="opd-register">
          <OpdRegisterTab />
        </RadixTabs.Content>
      </RadixTabs.Root>
    </div>
  );
}
