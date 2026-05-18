import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Receipt, Plus, TrendingUp, Clock, IndianRupee } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { billingApi } from '@/services/billing.service';
import type { InvoiceDoc, BillingStats, PaymentStatus } from '@/services/billing.service';
import { PAYMENT_STATUS_CONFIG } from '@/constants/billing';
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
        {canCreate && (
          <Button onClick={() => navigate('/billing/new')} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Invoice
          </Button>
        )}
      </div>

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
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                          {cfg.label}
                        </span>
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
