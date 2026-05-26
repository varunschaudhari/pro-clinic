import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Receipt, Plus, TrendingUp, Clock, IndianRupee, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { billingApi } from '@/services/billing.service';
import type { InvoiceDoc, BillingStats, BillingAnalytics, PaymentStatus } from '@/services/billing.service';
import { PAYMENT_STATUS_CONFIG, ITEM_TYPE_LABELS } from '@/constants/billing';
import { getErrorMessage, formatDate } from '@/lib/utils';
import { useAppSelector } from '@/app/hooks';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const STATUS_FILTERS: { value: PaymentStatus | ''; label: string }[] = [
  { value: '',         label: 'All' },
  { value: 'pending',  label: 'Pending' },
  { value: 'partial',  label: 'Partial' },
  { value: 'paid',     label: 'Paid' },
  { value: 'refunded', label: 'Refunded' },
];

const fmtRevenue = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

const fmtAxisDate = (d: string) => {
  const [, m, day] = d.split('-');
  return `${parseInt(day)}/${parseInt(m)}`;
};

const ITEM_COLORS: Record<string, string> = {
  consultation: '#6366f1',
  medicine:     '#22c55e',
  lab:          '#f59e0b',
  procedure:    '#3b82f6',
  other:        '#94a3b8',
};

function AnalyticsPanel({ analytics }: { analytics: BillingAnalytics }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Daily revenue trend */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3">Daily Revenue — Last 30 Days</p>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={analytics.dailyTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="billingGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtAxisDate} tick={{ fontSize: 10 }} interval={4} />
            <YAxis tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 10 }} width={42} />
            <Tooltip
              formatter={(v: number) => [fmtRevenue(v), 'Revenue']}
              labelFormatter={(l) => {
                const [y, m, d] = (l as string).split('-');
                return new Date(+y, +m - 1, +d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
              }}
            />
            <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#billingGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue by item type */}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3">Revenue by Item Type — Last 30 Days</p>
        {analytics.byItemType.length === 0 ? (
          <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={analytics.byItemType} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="type"
                tickFormatter={(t) => ITEM_TYPE_LABELS[t as keyof typeof ITEM_TYPE_LABELS] ?? t}
                tick={{ fontSize: 10 }}
              />
              <YAxis tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} tick={{ fontSize: 10 }} width={42} />
              <Tooltip
                formatter={(v: number) => [fmtRevenue(v), 'Revenue']}
                labelFormatter={(l) => ITEM_TYPE_LABELS[l as keyof typeof ITEM_TYPE_LABELS] ?? l}
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {analytics.byItemType.map((entry) => (
                  <Cell key={entry.type} fill={ITEM_COLORS[entry.type] ?? '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default function BillingPage() {
  const navigate       = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user           = useAppSelector((s) => s.auth.user);

  const [invoices, setInvoices] = useState<InvoiceDoc[]>([]);
  const [stats, setStats]       = useState<BillingStats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const LIMIT = 20;

  const [showAnalytics, setShowAnalytics] = useState(
    () => localStorage.getItem('billing-analytics-open') === 'true'
  );
  const [analytics, setAnalytics]             = useState<BillingAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const patientId     = searchParams.get('patientId') ?? undefined;
  const statusFilter  = (searchParams.get('status') ?? '') as PaymentStatus | '';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [listRes, statsRes] = await Promise.all([
        billingApi.list({
          patientId,
          paymentStatus: statusFilter || undefined,
          page,
          limit: LIMIT,
        }),
        billingApi.stats(),
      ]);
      setInvoices(listRes.data.data);
      setTotal(listRes.data.pagination.total);
      setStats(statsRes.data.data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [patientId, statusFilter, page]);

  const isAdminOrReceptionist = ['ClinicAdmin', 'Receptionist'].includes(user?.role ?? '');

  const toggleAnalytics = async () => {
    const next = !showAnalytics;
    setShowAnalytics(next);
    localStorage.setItem('billing-analytics-open', String(next));
    if (next && !analytics) {
      setAnalyticsLoading(true);
      try {
        const res = await billingApi.analytics(30);
        setAnalytics(res.data.data);
      } catch {
        // silently ignore — panel will just be empty
      } finally {
        setAnalyticsLoading(false);
      }
    }
  };

  // Auto-load if panel was open on mount
  useEffect(() => {
    if (showAnalytics && !analytics) {
      billingApi.analytics(30)
        .then((res) => setAnalytics(res.data.data))
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.ceil(total / LIMIT) || 1;
  const canCreate  = ['ClinicAdmin', 'Receptionist', 'Doctor'].includes(user?.role ?? '');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Billing & Invoices</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} invoice{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdminOrReceptionist && (
            <Button variant="outline" size="sm" onClick={toggleAnalytics}>
              <BarChart2 className="h-4 w-4 mr-1" />
              Analytics
              {showAnalytics
                ? <ChevronUp className="h-3.5 w-3.5 ml-1" />
                : <ChevronDown className="h-3.5 w-3.5 ml-1" />
              }
            </Button>
          )}
          {canCreate && (
            <Button onClick={() => navigate('/billing/new')} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Invoice
            </Button>
          )}
        </div>
      </div>

      {/* Analytics panel */}
      {showAnalytics && isAdminOrReceptionist && (
        <div>
          {analyticsLoading || !analytics ? (
            <div className="flex justify-center py-8"><Spinner size="md" /></div>
          ) : (
            <AnalyticsPanel analytics={analytics} />
          )}
        </div>
      )}

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <IndianRupee className="h-4 w-4" />
              <span className="text-xs font-medium">Today's Billing</span>
            </div>
            <p className="text-xl font-bold text-foreground">{fmt(stats.todayAmount)}</p>
            <p className="text-xs text-muted-foreground">{stats.todayCount} invoices</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Total Collected</span>
            </div>
            <p className="text-xl font-bold text-green-600">{fmt(stats.totalCollected)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Pending</span>
            </div>
            <p className="text-xl font-bold text-yellow-600">{fmt(stats.totalReceivable)}</p>
            <p className="text-xs text-muted-foreground">{stats.pendingCount + stats.partialCount} invoices</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Receipt className="h-4 w-4" />
              <span className="text-xs font-medium">Unpaid Count</span>
            </div>
            <p className="text-xl font-bold text-orange-600">{stats.pendingCount}</p>
            <p className="text-xs text-muted-foreground">{stats.partialCount} partial</p>
          </div>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-border pb-0">
        {STATUS_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => {
              setPage(1);
              const p = new URLSearchParams(searchParams);
              if (value) p.set('status', value);
              else p.delete('status');
              setSearchParams(p);
            }}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              statusFilter === value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : invoices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Receipt className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No invoices found</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Invoice No.</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Patient</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Date</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Total</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Paid</th>
                  <th className="text-right px-4 py-2.5 font-medium text-muted-foreground text-xs">Balance</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => {
                  const cfg = PAYMENT_STATUS_CONFIG[inv.paymentStatus];
                  return (
                    <tr
                      key={inv._id}
                      className={`hover:bg-muted/30 transition-colors cursor-pointer ${inv.isCancelled ? 'opacity-50' : ''}`}
                      onClick={() => navigate(`/billing/${inv._id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">
                        {inv.invoiceNumber}
                        {inv.isCancelled && <span className="ml-1 text-destructive">(Cancelled)</span>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{inv.patient.name}</p>
                        <p className="text-xs text-muted-foreground">{inv.patient.patientId}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(inv.invoiceDate)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{fmt(inv.totalAmount)}</td>
                      <td className="px-4 py-3 text-right text-green-600">{fmt(inv.paidAmount)}</td>
                      <td className="px-4 py-3 text-right">
                        {inv.balanceAmount > 0
                          ? <span className="text-red-600 font-medium">{fmt(inv.balanceAmount)}</span>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                          {!inv.isCancelled && inv.paymentStatus !== 'paid' && inv.dueDate && new Date(inv.dueDate) < new Date() && (
                            <span className="text-xs text-red-600 font-medium">
                              {Math.floor((Date.now() - new Date(inv.dueDate).getTime()) / 86400000)}d overdue
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground self-center">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
