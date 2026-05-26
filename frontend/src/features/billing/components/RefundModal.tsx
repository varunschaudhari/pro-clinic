import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/Label';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import type { IssueRefundPayload } from '@/services/billing.service';

const REFUND_MODE_OPTIONS = [
  { value: 'cash',         label: 'Cash' },
  { value: 'upi',          label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other',        label: 'Other' },
];

interface RefundModalProps {
  open:          boolean;
  onClose:       () => void;
  onSubmit:      (payload: IssueRefundPayload) => Promise<void>;
  invoiceNumber: string;
  paidAmount:    number;
}

export const RefundModal = ({ open, onClose, onSubmit, invoiceNumber, paidAmount }: RefundModalProps) => {
  const [reason,     setReason]     = useState('');
  const [refundMode, setRefundMode] = useState<IssueRefundPayload['refundMode']>('cash');
  const [refNo,      setRefNo]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  const reset = () => { setReason(''); setRefundMode('cash'); setRefNo(''); setError(''); };

  const handleClose = () => { if (!loading) { reset(); onClose(); } };

  const handleSubmit = async () => {
    if (!reason.trim()) { setError('Please provide a reason for the refund'); return; }
    setLoading(true);
    setError('');
    try {
      await onSubmit({ reason: reason.trim(), refundMode, refundTransactionId: refNo.trim() || undefined });
      reset();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to issue refund');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Issue Full Refund" size="sm">
      {/* Warning */}
      <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-700">
            Full refund of ₹{paidAmount.toFixed(2)} will be issued
          </p>
          <p className="text-xs text-red-600 mt-0.5">
            Invoice <span className="font-mono font-semibold">{invoiceNumber}</span> will be
            marked as <strong>Refunded</strong>. This cannot be undone.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Reason <span className="text-destructive">*</span></Label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Wrong patient entry, duplicate invoice, service not rendered..."
            className="mt-1 flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        <div>
          <Label>Refund Payment Mode <span className="text-destructive">*</span></Label>
          <Select
            className="mt-1"
            value={refundMode}
            onChange={(e) => setRefundMode(e.target.value as IssueRefundPayload['refundMode'])}
            options={REFUND_MODE_OPTIONS}
          />
        </div>

        <div>
          <Label>Reference / Transaction No. <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Input
            value={refNo}
            onChange={(e) => setRefNo(e.target.value)}
            placeholder="UPI transaction ID, bank ref..."
            className="mt-1"
          />
        </div>
      </div>

      {error && <Alert variant="error" className="mt-3">{error}</Alert>}

      <div className="flex justify-end gap-2 mt-5">
        <Button variant="outline" size="sm" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="destructive" size="sm" isLoading={loading} onClick={handleSubmit}>
          Confirm Refund
        </Button>
      </div>
    </Dialog>
  );
};
