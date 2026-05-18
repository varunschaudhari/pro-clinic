import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { PAYMENT_MODE_OPTIONS } from '@/constants/billing';
import type { RecordPaymentPayload } from '@/services/billing.service';

const schema = z.object({
  amount:        z.coerce.number().min(0.01, 'Amount must be > 0'),
  mode:          z.enum(['cash', 'card', 'upi', 'netbanking', 'insurance', 'other']),
  transactionId: z.string().trim().optional(),
  notes:         z.string().trim().optional(),
});

type FormValues = z.infer<typeof schema>;

interface RecordPaymentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: RecordPaymentPayload) => Promise<void>;
  balanceAmount: number;
  invoiceNumber: string;
}

export const RecordPaymentModal = ({
  open,
  onClose,
  onSubmit,
  balanceAmount,
  invoiceNumber,
}: RecordPaymentModalProps) => {
  const [error, setError] = useState('');

  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: balanceAmount,
      mode:   'cash',
    },
  });

  const handleFormSubmit = async (values: FormValues) => {
    setError('');
    try {
      await onSubmit({
        amount:        values.amount,
        mode:          values.mode,
        transactionId: values.transactionId || undefined,
        notes:         values.notes         || undefined,
      });
      reset();
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Failed to record payment');
    }
  };

  return (
    <Dialog open={open} onClose={() => { reset(); setError(''); onClose(); }} title="Record Payment" size="sm">
      <p className="text-xs text-muted-foreground mb-3">
        Invoice <span className="font-semibold text-foreground">{invoiceNumber}</span>
        {' · '}Balance: <span className="font-semibold text-foreground">₹{balanceAmount.toFixed(2)}</span>
      </p>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-3">
        <div>
          <Label>Amount (₹) <span className="text-destructive">*</span></Label>
          <Input
            {...register('amount')}
            type="number"
            min={0.01}
            step={0.01}
            max={balanceAmount}
            className="mt-1"
            error={errors.amount?.message}
          />
        </div>

        <div>
          <Label>Payment Mode <span className="text-destructive">*</span></Label>
          <Controller
            name="mode"
            control={control}
            render={({ field }) => (
              <Select
                options={PAYMENT_MODE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                className="mt-1"
                error={errors.mode?.message}
              />
            )}
          />
        </div>

        <div>
          <Label>Transaction / Reference ID</Label>
          <Input
            {...register('transactionId')}
            placeholder="UPI ref, card txn ID..."
            className="mt-1"
          />
        </div>

        <div>
          <Label>Notes</Label>
          <Input
            {...register('notes')}
            placeholder="Optional notes"
            className="mt-1"
          />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={() => { reset(); setError(''); onClose(); }} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            Record Payment
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
