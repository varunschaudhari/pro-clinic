import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';

import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { pharmacyApi } from '@/services/pharmacy.service';
import type { DrugDoc, DispensePayload } from '@/services/pharmacy.service';
import { getErrorMessage } from '@/lib/utils';

const schema = z.object({
  items: z.array(
    z.object({
      drugId:   z.string().min(1, 'Select a drug'),
      drugName: z.string(),
      quantity: z.coerce.number().positive('Quantity required'),
    })
  ).min(1),
  prescriptionId: z.string().optional(),
  patientId:      z.string().optional(),
  notes:          z.string().trim().optional(),
});

type DispenseFormValues = z.infer<typeof schema>;

interface DispenseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  drugs: DrugDoc[];
  prescriptionId?: string;
  patientId?: string;
}

export const DispenseModal = ({
  open,
  onClose,
  onSuccess,
  drugs,
  prescriptionId,
  patientId,
}: DispenseModalProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const { register, control, handleSubmit, watch, reset, formState: { errors } } =
    useForm<DispenseFormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        items: [{ drugId: '', drugName: '', quantity: 1 }],
        prescriptionId: prescriptionId ?? '',
        patientId:      patientId      ?? '',
        notes:          '',
      },
    });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const handleClose = () => {
    reset();
    setError('');
    onClose();
  };

  const onSubmit = async (values: DispenseFormValues) => {
    setSubmitting(true);
    setError('');
    try {
      const payload: DispensePayload = {
        items: values.items.map((i) => ({ drugId: i.drugId, quantity: i.quantity })),
        prescriptionId: values.prescriptionId || undefined,
        patientId:      values.patientId      || undefined,
        notes:          values.notes          || undefined,
      };
      await pharmacyApi.dispense(payload);
      onSuccess();
      handleClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const watchedItems = watch('items');

  return (
    <Dialog open={open} onClose={handleClose} title="Dispense Drugs" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Drug rows */}
        <div className="space-y-2">
          {fields.map((field, index) => {
            const selectedDrug = drugs.find((d) => d._id === watchedItems[index]?.drugId);
            return (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                {/* Drug select */}
                <div className="col-span-7">
                  <select
                    {...register(`items.${index}.drugId`)}
                    className="flex h-9 w-full appearance-none rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">— Select Drug —</option>
                    {drugs.map((d) => (
                      <option key={d._id} value={d._id} disabled={d.currentStock === 0}>
                        {d.name}{d.genericName ? ` (${d.genericName})` : ''} — Stock: {d.currentStock}
                      </option>
                    ))}
                  </select>
                  {selectedDrug && selectedDrug.currentStock <= selectedDrug.reorderLevel && (
                    <p className="text-xs text-orange-600 mt-0.5">
                      Low stock: {selectedDrug.currentStock} remaining
                    </p>
                  )}
                </div>

                {/* Quantity */}
                <div className="col-span-3">
                  <Input
                    {...register(`items.${index}.quantity`)}
                    type="number"
                    step="0.001"
                    placeholder="Qty"
                    className="h-9 text-sm"
                    error={(errors.items?.[index] as any)?.quantity?.message}
                  />
                </div>

                {/* Remove */}
                <div className="col-span-2 flex justify-center">
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ drugId: '', drugName: '', quantity: 1 })}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Drug
        </Button>

        <div>
          <Label>Notes</Label>
          <Input {...register('notes')} placeholder="Additional instructions..." className="mt-1" />
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={submitting}>
            Dispense
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
