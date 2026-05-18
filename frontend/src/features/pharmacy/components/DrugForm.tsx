import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import {
  DRUG_CATEGORY_OPTIONS,
  DRUG_UNIT_OPTIONS,
  GST_RATE_OPTIONS,
} from '@/constants/pharmacy';
import type { CreateDrugPayload, UpdateDrugPayload } from '@/services/pharmacy.service';

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  name:                z.string().trim().min(1, 'Name required'),
  genericName:         z.string().trim().optional(),
  brand:               z.string().trim().optional(),
  manufacturer:        z.string().trim().optional(),
  category:            z.enum(['medicine', 'consumable', 'equipment', 'supplement', 'other']),
  unit:                z.enum(['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'powder', 'sachet', 'other']),
  packSize:            z.coerce.number().int().positive().optional().or(z.literal('')),
  sellingPrice:        z.coerce.number().min(0),
  mrp:                 z.coerce.number().min(0),
  purchasePrice:       z.coerce.number().min(0).default(0),
  hsnCode:             z.string().trim().optional(),
  gstRate:             z.coerce.number().default(0),
  schedule:            z.enum(['H', 'H1', 'X', 'G', 'OTC', '']).optional(),
  requiresPrescription:z.boolean().default(false),
  reorderLevel:        z.coerce.number().min(0).default(10),
  maxStock:            z.coerce.number().min(0).optional().or(z.literal('')),
  location:            z.string().trim().optional(),
  notes:               z.string().trim().optional(),
  // Opening stock (create only)
  initialQuantity:     z.coerce.number().min(0).optional().or(z.literal('')),
  initialBatchNumber:  z.string().trim().optional(),
  initialExpiryDate:   z.string().optional(),
});

export type DrugFormValues = z.infer<typeof schema>;

// ── Section Card ──────────────────────────────────────────────────────────────

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    {children}
  </div>
);

// ── Props ─────────────────────────────────────────────────────────────────────

interface DrugFormProps {
  defaultValues?: Partial<DrugFormValues>;
  onSubmit: (payload: CreateDrugPayload | UpdateDrugPayload) => Promise<void>;
  isEdit?: boolean;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const DrugForm = ({
  defaultValues,
  onSubmit,
  isEdit = false,
  isSubmitting = false,
  onCancel,
}: DrugFormProps) => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DrugFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:                 '',
      genericName:          '',
      brand:                '',
      manufacturer:         '',
      category:             'medicine',
      unit:                 'tablet',
      sellingPrice:         0,
      mrp:                  0,
      purchasePrice:        0,
      hsnCode:              '',
      gstRate:              0,
      schedule:             '',
      requiresPrescription: false,
      reorderLevel:         10,
      location:             '',
      notes:                '',
      initialQuantity:      '',
      initialBatchNumber:   '',
      initialExpiryDate:    '',
      ...defaultValues,
    },
  });

  const handleFormSubmit = async (values: DrugFormValues) => {
    const payload: CreateDrugPayload = {
      name:                 values.name,
      genericName:          values.genericName     || undefined,
      brand:                values.brand           || undefined,
      manufacturer:         values.manufacturer    || undefined,
      category:             values.category,
      unit:                 values.unit,
      packSize:             values.packSize         ? Number(values.packSize)  : undefined,
      sellingPrice:         values.sellingPrice,
      mrp:                  values.mrp,
      purchasePrice:        values.purchasePrice,
      hsnCode:              values.hsnCode          || undefined,
      gstRate:              values.gstRate,
      schedule:             values.schedule         || undefined,
      requiresPrescription: values.requiresPrescription,
      reorderLevel:         values.reorderLevel,
      maxStock:             values.maxStock         ? Number(values.maxStock)  : undefined,
      location:             values.location         || undefined,
      notes:                values.notes            || undefined,
      ...(!isEdit && {
        initialQuantity:    values.initialQuantity   ? Number(values.initialQuantity) : undefined,
        initialBatchNumber: values.initialBatchNumber || undefined,
        initialExpiryDate:  values.initialExpiryDate  || undefined,
      }),
    };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">

      {/* Drug identity */}
      <SectionCard title="Drug / Item Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Name <span className="text-destructive">*</span></Label>
            <Input
              {...register('name')}
              placeholder="e.g., Paracetamol 500mg"
              className="mt-1"
              error={errors.name?.message}
            />
          </div>
          <div>
            <Label>Generic Name</Label>
            <Input
              {...register('genericName')}
              placeholder="e.g., Acetaminophen"
              className="mt-1"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Brand / Trade Name</Label>
            <Input {...register('brand')} placeholder="e.g., Calpol" className="mt-1" />
          </div>
          <div>
            <Label>Manufacturer</Label>
            <Input {...register('manufacturer')} placeholder="e.g., GSK" className="mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Category</Label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select
                  options={DRUG_CATEGORY_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  className="mt-1"
                />
              )}
            />
          </div>
          <div>
            <Label>Unit</Label>
            <Controller
              name="unit"
              control={control}
              render={({ field }) => (
                <Select
                  options={DRUG_UNIT_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  className="mt-1"
                />
              )}
            />
          </div>
          <div>
            <Label>Pack Size</Label>
            <Input
              {...register('packSize')}
              type="number"
              placeholder="e.g., 10"
              className="mt-1"
            />
          </div>
        </div>
      </SectionCard>

      {/* Pricing */}
      <SectionCard title="Pricing & GST">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>MRP <span className="text-destructive">*</span></Label>
            <Input
              {...register('mrp')}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="mt-1"
              error={errors.mrp?.message}
            />
          </div>
          <div>
            <Label>Selling Price <span className="text-destructive">*</span></Label>
            <Input
              {...register('sellingPrice')}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="mt-1"
              error={errors.sellingPrice?.message}
            />
          </div>
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
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>HSN Code</Label>
            <Input
              {...register('hsnCode')}
              placeholder="e.g., 3004"
              className="mt-1"
            />
          </div>
          <div>
            <Label>GST Rate</Label>
            <Controller
              name="gstRate"
              control={control}
              render={({ field }) => (
                <Select
                  options={GST_RATE_OPTIONS}
                  value={String(field.value)}
                  onChange={(v) => field.onChange(Number(v))}
                  className="mt-1"
                />
              )}
            />
          </div>
        </div>
      </SectionCard>

      {/* Regulatory */}
      <SectionCard title="Regulatory & Storage">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Drug Schedule</Label>
            <Controller
              name="schedule"
              control={control}
              render={({ field }) => (
                <Select
                  options={[
                    { value: '', label: '— Not Applicable —' },
                    { value: 'OTC', label: 'OTC (Over the Counter)' },
                    { value: 'G', label: 'Schedule G (Medical Supervision)' },
                    { value: 'H', label: 'Schedule H (Prescription Only)' },
                    { value: 'H1', label: 'Schedule H1 (Controlled)' },
                    { value: 'X', label: 'Schedule X (Habit-forming)' },
                  ]}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  className="mt-1"
                />
              )}
            />
          </div>
          <div>
            <Label>Reorder Level</Label>
            <Input
              {...register('reorderLevel')}
              type="number"
              placeholder="10"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Max Stock</Label>
            <Input
              {...register('maxStock')}
              type="number"
              placeholder="Optional"
              className="mt-1"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Shelf / Location</Label>
            <Input {...register('location')} placeholder="e.g., Rack A-3" className="mt-1" />
          </div>
          <div className="flex items-center gap-3 mt-6">
            <input
              {...register('requiresPrescription')}
              type="checkbox"
              id="requiresPrescription"
              className="h-4 w-4 rounded border-input accent-primary"
            />
            <label htmlFor="requiresPrescription" className="text-sm font-medium cursor-pointer">
              Requires prescription
            </label>
          </div>
        </div>
        {/* Notes */}
        <div>
          <Label>Notes</Label>
          <textarea
            {...register('notes')}
            rows={2}
            placeholder="Storage instructions, special handling..."
            className="mt-1 flex min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>
      </SectionCard>

      {/* Opening stock (create only) */}
      {!isEdit && (
        <SectionCard title="Opening Stock (Optional)">
          <p className="text-xs text-muted-foreground">
            Add initial stock now, or use Stock-In later after saving the drug.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Opening Quantity</Label>
              <Input
                {...register('initialQuantity')}
                type="number"
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Batch Number</Label>
              <Input
                {...register('initialBatchNumber')}
                placeholder="e.g., BT-2024-001"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Expiry Date</Label>
              <Input
                {...register('initialExpiryDate')}
                type="date"
                className="mt-1"
              />
            </div>
          </div>
        </SectionCard>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isSubmitting}>
          {isEdit ? 'Update Drug' : 'Save Drug'}
        </Button>
      </div>
    </form>
  );
};
