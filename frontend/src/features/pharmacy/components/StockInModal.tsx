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
import { pharmacyApi } from '@/services/pharmacy.service';
import type { DrugDoc, StockInPayload } from '@/services/pharmacy.service';
import { STOCK_IN_TYPE_OPTIONS } from '@/constants/pharmacy';
import { getErrorMessage } from '@/lib/utils';

const schema = z.object({
  type:          z.enum(['purchase', 'return', 'adjustment']).default('purchase'),
  quantity:      z.coerce.number().positive('Quantity required'),
  batchNumber:   z.string().trim().optional(),
  expiryDate:    z.string().optional(),
  purchasePrice: z.coerce.number().min(0).optional().or(z.literal('')),
  mrp:           z.coerce.number().min(0).optional().or(z.literal('')),
  sellingPrice:  z.coerce.number().min(0).optional().or(z.literal('')),
  notes:         z.string().trim().optional(),
});

type StockInFormValues = z.infer<typeof schema>;

interface StockInModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (drug: DrugDoc) => void;
  drug: DrugDoc;
}

export const StockInModal = ({ open, onClose, onSuccess, drug }: StockInModalProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<StockInFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type:  'purchase',
      quantity:      1,
      purchasePrice: drug.purchasePrice || '',
      mrp:           drug.mrp || '',
      sellingPrice:  drug.sellingPrice || '',
    },
  });

  const handleClose = () => {
    reset();
    setError('');
    onClose();
  };

  const onSubmit = async (values: StockInFormValues) => {
    setSubmitting(true);
    setError('');
    try {
      const payload: StockInPayload = {
        quantity:      values.quantity,
        batchNumber:   values.batchNumber   || undefined,
        expiryDate:    values.expiryDate    || undefined,
        purchasePrice: values.purchasePrice ? Number(values.purchasePrice) : undefined,
        mrp:           values.mrp           ? Number(values.mrp)           : undefined,
        sellingPrice:  values.sellingPrice  ? Number(values.sellingPrice)  : undefined,
        notes:         values.notes         || undefined,
      };
      const res = await pharmacyApi.stockIn(drug._id, payload, values.type);
      onSuccess(res.data.data);
      handleClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} title={`Add Stock — ${drug.name}`} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Transaction Type</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select
                  options={STOCK_IN_TYPE_OPTIONS}
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
              placeholder="0"
              className="mt-1"
              error={errors.quantity?.message}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Batch Number</Label>
            <Input {...register('batchNumber')} placeholder="e.g., BT-2024-001" className="mt-1" />
          </div>
          <div>
            <Label>Expiry Date</Label>
            <Input {...register('expiryDate')} type="date" className="mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Purchase Price</Label>
            <Input
              {...register('purchasePrice')}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="mt-1"
            />
          </div>
          <div>
            <Label>MRP</Label>
            <Input
              {...register('mrp')}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Selling Price</Label>
            <Input
              {...register('sellingPrice')}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label>Notes</Label>
          <Input {...register('notes')} placeholder="Supplier name, PO number..." className="mt-1" />
        </div>

        <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
          Current stock: <span className="font-semibold">{drug.currentStock} {drug.unit}s</span>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={submitting}>
            Add Stock
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
