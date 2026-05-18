import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';

import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { pharmacyApi } from '@/services/pharmacy.service';
import type { DrugDoc } from '@/services/pharmacy.service';
import { STOCK_OUT_TYPE_OPTIONS } from '@/constants/pharmacy';
import { getErrorMessage } from '@/lib/utils';

const schema = z.object({
  type:        z.enum(['expired', 'adjustment']).default('expired'),
  quantity:    z.coerce.number().positive('Quantity required'),
  batchNumber: z.string().trim().optional(),
  notes:       z.string().trim().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface StockOutModalProps {
  open:      boolean;
  onClose:   () => void;
  onSuccess: (drug: DrugDoc) => void;
  drug:      DrugDoc;
}

export const StockOutModal = ({ open, onClose, onSuccess, drug }: StockOutModalProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'expired', quantity: 1 },
  });

  useEffect(() => {
    if (open) { reset({ type: 'expired', quantity: 1 }); setError(''); }
  }, [open, reset]);

  const handleClose = () => {
    reset();
    setError('');
    onClose();
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    setError('');
    try {
      const res = await pharmacyApi.stockOut(drug._id, {
        quantity:    values.quantity,
        type:        values.type,
        batchNumber: values.batchNumber || undefined,
        notes:       values.notes       || undefined,
      });
      onSuccess(res.data.data);
      handleClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={`Write Off Stock — ${drug.name}`}
      description="Record expired, damaged, or written-off stock. This will reduce the current stock count."
      size="sm"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Reason <span className="text-destructive">*</span></Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select
                  options={STOCK_OUT_TYPE_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  className="mt-1"
                />
              )}
            />
          </div>
          <div>
            <Label>Quantity <span className="text-destructive">*</span></Label>
            <Input
              {...register('quantity')}
              type="number"
              step="0.001"
              min={0.001}
              max={drug.currentStock}
              placeholder="0"
              className="mt-1"
              error={errors.quantity?.message}
            />
          </div>
        </div>

        <div>
          <Label>Batch Number</Label>
          <Input
            {...register('batchNumber')}
            placeholder="e.g., BT-2024-001"
            className="mt-1"
            list="batch-opts"
          />
          {drug.batches.length > 0 && (
            <datalist id="batch-opts">
              {drug.batches.map((b) => (
                <option key={b._id} value={b.batchNumber} />
              ))}
            </datalist>
          )}
        </div>

        <div>
          <Label>Notes</Label>
          <Input
            {...register('notes')}
            placeholder="Reason, inspector name..."
            className="mt-1"
          />
        </div>

        <div className="text-xs text-muted-foreground bg-orange-50 border border-orange-100 rounded p-2">
          Current stock: <span className="font-semibold text-orange-700">{drug.currentStock} {drug.unit}s</span>
          {' '}— stock will decrease after write-off.
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="destructive" isLoading={submitting}>
            Write Off
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
