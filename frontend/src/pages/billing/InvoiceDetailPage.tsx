import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, IndianRupee, XCircle, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { InvoicePrintView } from '@/features/billing/components/InvoicePrintView';
import { RecordPaymentModal } from '@/features/billing/components/RecordPaymentModal';
import { billingApi } from '@/services/billing.service';
import type { InvoiceDoc } from '@/services/billing.service';
import { PAYMENT_STATUS_CONFIG } from '@/constants/billing';
import { getErrorMessage } from '@/lib/utils';
import { useAppSelector } from '@/app/hooks';

export default function InvoiceDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user     = useAppSelector((s) => s.auth.user);
  const clinic   = useAppSelector((s) => s.clinic.clinic);

  const [invoice, setInvoice]     = useState<InvoiceDoc | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const [showPayment, setShowPayment]   = useState(false);
  const [showCancel, setShowCancel]     = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling]     = useState(false);
  const [cancelError, setCancelError]   = useState('');

  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    billingApi.get(id!)
      .then((res) => setInvoice(res.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const handlePaymentSubmit = async (payload: Parameters<typeof billingApi.recordPayment>[1]) => {
    const res = await billingApi.recordPayment(id!, payload);
    setInvoice(res.data.data);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) { setCancelError('Reason is required'); return; }
    setCancelling(true);
    setCancelError('');
    try {
      const res = await billingApi.cancel(id!, cancelReason);
      setInvoice(res.data.data as InvoiceDoc);
      setShowCancel(false);
    } catch (e) {
      setCancelError(getErrorMessage(e));
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await billingApi.delete(id!);
      navigate('/billing', { replace: true });
    } catch (e) {
      setDeleteError(getErrorMessage(e));
      setDeleting(false);
    }
  };

  const handlePrint = () => window.print();

  const isAdmin = user?.role === 'ClinicAdmin';
  const canRecordPayment =
    invoice && !invoice.isCancelled && invoice.balanceAmount > 0 &&
    ['ClinicAdmin', 'Receptionist'].includes(user?.role ?? '');

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error || !invoice) return (
    <div className="max-w-4xl mx-auto"><Alert variant="error">{error || 'Invoice not found'}</Alert></div>
  );

  const statusCfg = PAYMENT_STATUS_CONFIG[invoice.paymentStatus];

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header — hidden when printing */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">{invoice.invoiceNumber}</h1>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusCfg.badge}`}>
                  {statusCfg.label}
                </span>
                {invoice.isCancelled && (
                  <span className="text-xs text-destructive font-medium">(Cancelled)</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {invoice.patient.name} · ₹{invoice.totalAmount.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canRecordPayment && (
              <Button size="sm" onClick={() => setShowPayment(true)}>
                <IndianRupee className="h-4 w-4 mr-1" />
                Record Payment
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
            {isAdmin && !invoice.isCancelled && invoice.paidAmount === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCancel(true)}
                className="text-destructive border-destructive/40 hover:bg-destructive/5"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
            {isAdmin && (
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

        {/* Print area */}
        <div className="rounded-xl border border-border bg-white p-6 relative print:border-0 print:p-0 print:rounded-none">
          <InvoicePrintView invoice={invoice} clinic={clinic} />
        </div>
      </div>

      {/* Record payment modal */}
      {invoice && (
        <RecordPaymentModal
          open={showPayment}
          onClose={() => setShowPayment(false)}
          onSubmit={handlePaymentSubmit}
          balanceAmount={invoice.balanceAmount}
          invoiceNumber={invoice.invoiceNumber}
        />
      )}

      {/* Cancel dialog */}
      <Dialog
        open={showCancel}
        onClose={() => { setShowCancel(false); setCancelError(''); setCancelReason(''); }}
        title="Cancel Invoice"
        size="sm"
      >
        <p className="text-sm text-muted-foreground mb-3">
          Cancel <strong>{invoice.invoiceNumber}</strong>? This cannot be undone.
        </p>
        <div>
          <Label>Reason <span className="text-destructive">*</span></Label>
          <Input
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Duplicate invoice, data entry error..."
            className="mt-1"
          />
        </div>
        {cancelError && <Alert variant="error" className="mt-2">{cancelError}</Alert>}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => setShowCancel(false)} disabled={cancelling}>Cancel</Button>
          <Button variant="destructive" size="sm" isLoading={cancelling} onClick={handleCancel}>
            Confirm Cancel
          </Button>
        </div>
      </Dialog>

      {/* Delete dialog */}
      <Dialog
        open={showDelete}
        onClose={() => { setShowDelete(false); setDeleteError(''); }}
        title="Delete Invoice"
        size="sm"
      >
        <p className="text-sm text-muted-foreground">
          Permanently delete <strong>{invoice.invoiceNumber}</strong>?
        </p>
        {deleteError && <Alert variant="error" className="mt-2">{deleteError}</Alert>}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => setShowDelete(false)} disabled={deleting}>Cancel</Button>
          <Button variant="destructive" size="sm" isLoading={deleting} onClick={handleDelete}>Delete</Button>
        </div>
      </Dialog>
    </>
  );
}
