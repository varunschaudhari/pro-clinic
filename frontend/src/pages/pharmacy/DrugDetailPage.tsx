import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, AlertTriangle, PackageX, Pencil, Trash2,
  PackagePlus, ArrowDownToLine, PackageMinus, ChevronDown,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { Dialog } from '@/components/ui/Dialog';
import { StockInModal } from '@/features/pharmacy/components/StockInModal';
import { StockOutModal } from '@/features/pharmacy/components/StockOutModal';
import { DispenseModal } from '@/features/pharmacy/components/DispenseModal';
import { pharmacyApi } from '@/services/pharmacy.service';
import type { DrugWithTransactions, DrugDoc, StockTransactionDoc } from '@/services/pharmacy.service';
import {
  DRUG_CATEGORY_CONFIG,
  STOCK_TRANSACTION_TYPE_CONFIG,
  TXN_TYPE_FILTER_OPTIONS,
} from '@/constants/pharmacy';
import { getErrorMessage, formatDate } from '@/lib/utils';
import { useAppSelector } from '@/app/hooks';
import { cn } from '@/lib/utils';

export default function DrugDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user     = useAppSelector((s) => s.auth.user);

  const [drug, setDrug]       = useState<DrugWithTransactions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [showStockIn,   setShowStockIn]   = useState(false);
  const [showStockOut,  setShowStockOut]  = useState(false);
  const [showDispense,  setShowDispense]  = useState(false);
  const [showDelete,    setShowDelete]    = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  const [deleteError,   setDeleteError]   = useState('');

  // ── Transactions section ───────────────────────────────────────────────────
  const [txns,        setTxns]        = useState<StockTransactionDoc[]>([]);
  const [txnLoading,  setTxnLoading]  = useState(false);
  const [txnPage,     setTxnPage]     = useState(1);
  const [txnHasMore,  setTxnHasMore]  = useState(false);
  const [txnTotal,    setTxnTotal]    = useState(0);
  const [txnType,     setTxnType]     = useState('');

  const loadDrug = () => {
    setLoading(true);
    pharmacyApi.get(id!)
      .then((res) => setDrug(res.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  const loadTxns = useCallback(async (page: number, type: string, append = false) => {
    if (!id) return;
    setTxnLoading(true);
    try {
      const res = await pharmacyApi.transactions(id, { page, limit: 20, type: type || undefined });
      const { data, pagination } = res.data;
      setTxns((prev) => append ? [...prev, ...data] : data);
      setTxnHasMore(pagination.hasNext);
      setTxnTotal(pagination.total);
      setTxnPage(page);
    } catch {
      // ignore
    } finally {
      setTxnLoading(false);
    }
  }, [id]);

  useEffect(() => { loadDrug(); }, [id]);
  useEffect(() => { loadTxns(1, txnType); }, [loadTxns, txnType]);

  const handleLoadMore = () => loadTxns(txnPage + 1, txnType, true);

  const handleTypeFilter = (type: string) => {
    setTxnType(type);
    setTxns([]);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await pharmacyApi.delete(id!);
      navigate('/pharmacy', { replace: true });
    } catch (e) {
      setDeleteError(getErrorMessage(e));
      setDeleting(false);
    }
  };

  const handleStockUpdate = (updated: DrugDoc) => {
    setDrug((prev) => prev ? { ...prev, ...updated } : prev);
    loadTxns(1, txnType);
    loadDrug();
  };

  const canManage   = ['ClinicAdmin', 'Pharmacist'].includes(user?.role ?? '');
  const canDispense = ['ClinicAdmin', 'Pharmacist', 'Doctor'].includes(user?.role ?? '');

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error || !drug) return (
    <div className="max-w-4xl mx-auto"><Alert variant="error">{error || 'Drug not found'}</Alert></div>
  );

  const isLow = drug.currentStock <= drug.reorderLevel;
  const isOut = drug.currentStock === 0;
  const categoryCfg = DRUG_CATEGORY_CONFIG[drug.category];

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">{drug.name}</h1>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${categoryCfg.badge}`}>
                  {categoryCfg.label}
                </span>
                {drug.requiresPrescription && (
                  <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 border-purple-200">
                    Rx
                  </span>
                )}
              </div>
              {drug.genericName && (
                <p className="text-xs text-muted-foreground mt-0.5">{drug.genericName}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canDispense && drug.currentStock > 0 && (
              <Button size="sm" variant="outline" onClick={() => setShowDispense(true)}>
                <ArrowDownToLine className="h-4 w-4 mr-1" />
                Dispense
              </Button>
            )}
            {canManage && drug.currentStock > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowStockOut(true)}
                className="text-orange-600 border-orange-300 hover:bg-orange-50"
              >
                <PackageMinus className="h-4 w-4 mr-1" />
                Write Off
              </Button>
            )}
            {canManage && (
              <Button size="sm" onClick={() => setShowStockIn(true)}>
                <PackagePlus className="h-4 w-4 mr-1" />
                Stock In
              </Button>
            )}
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/pharmacy/${drug._id}/edit`)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {user?.role === 'ClinicAdmin' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDelete(true)}
                className="text-destructive hover:text-destructive h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Stock alert banners */}
        {isOut && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
            <PackageX className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">Out of stock — please reorder.</span>
          </div>
        )}
        {!isOut && isLow && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 border border-orange-200 text-orange-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">
              Low stock — {drug.currentStock} {drug.unit}s remaining (reorder level: {drug.reorderLevel}).
            </span>
          </div>
        )}
        {drug.nearExpiryBatches && drug.nearExpiryBatches.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">
              {drug.nearExpiryBatches.length} batch{drug.nearExpiryBatches.length !== 1 ? 'es expire' : ' expires'} within 30 days.
            </span>
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stock info */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Stock</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className={`text-2xl font-bold ${isOut ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-foreground'}`}>
                  {drug.currentStock}
                </p>
                <p className="text-xs text-muted-foreground">Current ({drug.unit}s)</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-muted-foreground">{drug.reorderLevel}</p>
                <p className="text-xs text-muted-foreground">Reorder Level</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-muted-foreground">{drug.maxStock ?? '—'}</p>
                <p className="text-xs text-muted-foreground">Max Stock</p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Pricing</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-foreground">₹{drug.mrp.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">MRP</p>
              </div>
              <div>
                <p className="text-lg font-bold text-primary">₹{drug.sellingPrice.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Selling</p>
              </div>
              <div>
                <p className="text-lg font-bold text-muted-foreground">₹{drug.purchasePrice.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Purchase</p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground border-t border-border pt-2 space-y-0.5">
              {drug.hsnCode && <p>HSN: <span className="font-medium text-foreground">{drug.hsnCode}</span></p>}
              <p>GST: <span className="font-medium text-foreground">{drug.gstRate}%</span></p>
            </div>
          </div>
        </div>

        {/* Drug details */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Drug Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            {drug.brand        && <div><p className="text-muted-foreground">Brand</p><p className="font-medium mt-0.5">{drug.brand}</p></div>}
            {drug.manufacturer && <div><p className="text-muted-foreground">Manufacturer</p><p className="font-medium mt-0.5">{drug.manufacturer}</p></div>}
            {drug.packSize     && <div><p className="text-muted-foreground">Pack Size</p><p className="font-medium mt-0.5">{drug.packSize} per pack</p></div>}
            {drug.schedule     && <div><p className="text-muted-foreground">Schedule</p><p className="font-medium mt-0.5">{drug.schedule}</p></div>}
            {drug.location     && <div><p className="text-muted-foreground">Location</p><p className="font-medium mt-0.5">{drug.location}</p></div>}
          </div>
          {drug.notes && (
            <p className="text-xs text-muted-foreground mt-3 border-t border-border pt-3">{drug.notes}</p>
          )}
        </div>

        {/* Batches */}
        {drug.batches && drug.batches.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 bg-muted/40 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Batch Inventory</h3>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Batch No.</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Expiry</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Qty</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Purchase</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">MRP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {drug.batches.map((b) => {
                  const expiry    = new Date(b.expiryDate);
                  const isExpired = expiry < new Date();
                  const isNearExp = !isExpired && expiry <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                  return (
                    <tr key={b._id} className={isExpired ? 'opacity-50' : ''}>
                      <td className="px-4 py-2 font-mono">{b.batchNumber}</td>
                      <td className={`px-4 py-2 ${isExpired ? 'text-red-600 font-medium' : isNearExp ? 'text-amber-600' : ''}`}>
                        {formatDate(b.expiryDate)}
                        {isExpired && ' (Expired)'}
                        {isNearExp && ' (Near expiry)'}
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">{b.quantity}</td>
                      <td className="px-4 py-2 text-right">₹{b.purchasePrice.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right">₹{b.mrp.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Transaction history */}
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-3 bg-muted/40 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Transaction History</h3>
              {txnTotal > 0 && (
                <p className="text-xs text-muted-foreground">{txnTotal} record{txnTotal !== 1 ? 's' : ''}</p>
              )}
            </div>
            {/* Type filter chips */}
            <div className="flex flex-wrap gap-1">
              {TXN_TYPE_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleTypeFilter(opt.value)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                    txnType === opt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {txns.length === 0 && !txnLoading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No transactions recorded{txnType ? ` for type "${txnType}"` : ''}.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Type</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Qty</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Before</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">After</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">By</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground hidden sm:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {txns.map((txn) => {
                  const cfg    = STOCK_TRANSACTION_TYPE_CONFIG[txn.type] ?? { label: txn.type, color: 'text-muted-foreground', direction: 'in' };
                  const isStockOut = txn.quantityAfter < txn.quantityBefore;
                  return (
                    <tr key={txn._id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                        {formatDate(txn.createdAt)}
                      </td>
                      <td className={`px-4 py-2.5 font-medium ${cfg.color}`}>{cfg.label}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${isStockOut ? 'text-red-600' : 'text-green-600'}`}>
                        {isStockOut ? '−' : '+'}{txn.quantity}
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{txn.quantityBefore}</td>
                      <td className="px-4 py-2.5 text-right font-medium">{txn.quantityAfter}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {typeof txn.createdBy === 'object' ? txn.createdBy.name : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground max-w-[160px] truncate hidden sm:table-cell">
                        {txn.notes ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {txnLoading && (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          )}

          {txnHasMore && !txnLoading && (
            <div className="px-4 py-3 border-t border-border bg-muted/20 flex justify-center">
              <Button variant="outline" size="sm" onClick={handleLoadMore}>
                <ChevronDown className="h-4 w-4 mr-1" />
                Load more
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {drug && showStockIn && (
        <StockInModal
          open={showStockIn}
          onClose={() => setShowStockIn(false)}
          onSuccess={handleStockUpdate}
          drug={drug}
        />
      )}

      {drug && showStockOut && (
        <StockOutModal
          open={showStockOut}
          onClose={() => setShowStockOut(false)}
          onSuccess={handleStockUpdate}
          drug={drug}
        />
      )}

      {drug && showDispense && (
        <DispenseModal
          open={showDispense}
          onClose={() => setShowDispense(false)}
          onSuccess={() => { loadDrug(); loadTxns(1, txnType); }}
          drugs={[drug]}
        />
      )}

      {/* Delete dialog */}
      <Dialog
        open={showDelete}
        onClose={() => { setShowDelete(false); setDeleteError(''); }}
        title="Delete Drug"
        size="sm"
      >
        <p className="text-sm text-muted-foreground">
          Permanently delete <strong>{drug?.name}</strong>? This cannot be undone.
        </p>
        {deleteError && <Alert variant="error" className="mt-2">{deleteError}</Alert>}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => setShowDelete(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" isLoading={deleting} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Dialog>
    </>
  );
}
