import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { cn, getErrorMessage } from '@/lib/utils';
import { pharmacyApi } from '@/services/pharmacy.service';
import type { StockTransactionWithDrug, DrugDoc } from '@/services/pharmacy.service';

// ── Config ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; color: string; dir: 'in' | 'out' }> = {
  purchase:   { label: 'Purchase',   color: 'text-green-600 bg-green-50',  dir: 'in'  },
  return:     { label: 'Return',     color: 'text-teal-600 bg-teal-50',    dir: 'in'  },
  dispense:   { label: 'Dispense',   color: 'text-blue-600 bg-blue-50',    dir: 'out' },
  sale:       { label: 'Sale',       color: 'text-indigo-600 bg-indigo-50',dir: 'out' },
  adjustment: { label: 'Adjustment', color: 'text-yellow-600 bg-yellow-50',dir: 'out' },
  expired:    { label: 'Expired',    color: 'text-red-600 bg-red-50',      dir: 'out' },
};

const TYPE_FILTER_OPTIONS = [
  { value: '', label: 'All Types' },
  ...Object.entries(TYPE_CONFIG).map(([v, c]) => ({ value: v, label: c.label })),
];

function todayStr() { return new Date().toISOString().slice(0, 10); }
function thirtyDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PharmacyLedgerPage() {
  const navigate = useNavigate();

  const [rows, setRows]       = useState<StockTransactionWithDrug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]     = useState(0);
  const LIMIT = 30;

  const [drugs, setDrugs]     = useState<DrugDoc[]>([]);
  const [drugId, setDrugId]   = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [startDate, setStartDate]   = useState(thirtyDaysAgo());
  const [endDate, setEndDate]       = useState(todayStr());

  // Load drug list for filter dropdown
  useEffect(() => {
    pharmacyApi.list({ limit: 200 })
      .then((res) => setDrugs(res.data.data))
      .catch(() => {});
  }, []);

  const drugOptions = [
    { value: '', label: 'All Drugs' },
    ...drugs.map((d) => ({ value: d._id, label: d.name })),
  ];

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await pharmacyApi.allTransactions({
        page: p, limit: LIMIT,
        type:      typeFilter  || undefined,
        drugId:    drugId      || undefined,
        startDate: startDate   || undefined,
        endDate:   endDate     || undefined,
      });
      setRows(res.data.data);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [typeFilter, drugId, startDate, endDate]);

  useEffect(() => {
    setPage(1);
    load(1);
  }, [load]);

  const handlePageChange = (p: number) => {
    setPage(p);
    load(p);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/pharmacy')}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Pharmacy
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Stock Ledger</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Complete stock movement history · {total} transaction{total !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">From</label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 rounded-md border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">To</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={todayStr()}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 rounded-md border border-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="w-48">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Drug</label>
            <Select
              value={drugId}
              onChange={(e) => setDrugId(e.target.value)}
              options={drugOptions}
            />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={TYPE_FILTER_OPTIONS}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setDrugId(''); setTypeFilter(''); setStartDate(thirtyDaysAgo()); setEndDate(todayStr()); }}
          >
            Reset
          </Button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <p className="text-sm font-semibold text-foreground">No transactions found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date / Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Drug</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qty</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Before → After</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Batch</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">By</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((txn) => {
                  const cfg = TYPE_CONFIG[txn.type] ?? { label: txn.type, color: 'text-gray-600 bg-gray-100', dir: 'out' as const };
                  const isIn = cfg.dir === 'in';
                  return (
                    <tr key={txn._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(txn.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                        <span className="block text-gray-400">
                          {new Date(txn.createdAt).toLocaleTimeString('en-IN', {
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/pharmacy/${txn.drugId}`)}
                          className="font-medium text-foreground hover:text-primary transition-colors text-left"
                        >
                          {txn.drug?.name ?? '—'}
                        </button>
                        {txn.drug?.unit && (
                          <span className="text-xs text-muted-foreground ml-1">({txn.drug.unit})</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', cfg.color)}>
                          {isIn
                            ? <ArrowUpCircle className="h-3 w-3" />
                            : <ArrowDownCircle className="h-3 w-3" />}
                          {cfg.label}
                        </span>
                      </td>
                      <td className={cn('px-4 py-3 text-right font-semibold tabular-nums', isIn ? 'text-green-600' : 'text-red-500')}>
                        {isIn ? '+' : '-'}{txn.quantity}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        {txn.quantityBefore}
                        <span className="mx-1 text-gray-300">→</span>
                        <span className={cn('font-medium', txn.quantityAfter === 0 ? 'text-red-500' : 'text-foreground')}>
                          {txn.quantityAfter}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {txn.batchNumber ?? '—'}
                        {txn.expiryDate && (
                          <span className="block text-gray-400">
                            Exp: {new Date(txn.expiryDate).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {(txn.createdBy as any)?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px] truncate" title={txn.notes}>
                        {txn.notes ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/40">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
