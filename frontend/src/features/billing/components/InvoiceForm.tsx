import { useState, useEffect, useRef } from 'react';
import { useFieldArray, useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Search, X } from 'lucide-react';

import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { InvoiceItemRow } from './InvoiceItemRow';
import { COMMON_ITEMS } from '@/constants/billing';
import { computeInvoiceTotals } from '@/services/billing.service';
import type { CreateInvoicePayload } from '@/services/billing.service';
import { patientApi } from '@/services/patient.service';
import type { PatientListItem } from '@/services/patient.service';

// ── Schema ────────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  type:        z.enum(['consultation', 'medicine', 'lab', 'procedure', 'other']),
  description: z.string().trim().min(1, 'Description required'),
  hsnCode:     z.string().trim().optional(),
  quantity:    z.coerce.number().min(0.01, 'Must be > 0'),
  unitPrice:   z.coerce.number().min(0, 'Must be ≥ 0'),
  discount:    z.coerce.number().min(0).default(0),
  gstRate:     z.coerce.number().default(0),
});

const schema = z.object({
  patientId:          z.string().min(1, 'Select a patient'),
  patientName:        z.string().optional(),
  appointmentId:      z.string().optional(),
  items:              z.array(itemSchema).min(1, 'Add at least one item'),
  isInterState:       z.boolean().default(false),
  clinicGstin:        z.string().trim().optional(),
  patientGstin:       z.string().trim().optional(),
  notes:              z.string().trim().max(500).optional(),
  termsAndConditions: z.string().trim().max(500).optional(),
  dueDate:            z.string().optional(),
});

export type InvoiceFormValues = z.infer<typeof schema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

const defaultItem: InvoiceFormValues['items'][0] = {
  type:        'consultation',
  description: '',
  hsnCode:     '',
  quantity:    1,
  unitPrice:   0,
  discount:    0,
  gstRate:     0,
};

const fmt = (n: number) => `₹${n.toFixed(2)}`;

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    {children}
  </div>
);

// ── Patient Search ─────────────────────────────────────────────────────────────

interface PatientSearchProps {
  value: string;
  displayName: string;
  onSelect: (id: string, name: string) => void;
  error?: string;
}

const PatientSearch = ({ value, displayName, onSelect, error }: PatientSearchProps) => {
  const [query, setQuery]         = useState(displayName);
  const [results, setResults]     = useState<PatientListItem[]>([]);
  const [showDrop, setShowDrop]   = useState(false);
  const timerRef                  = useRef<ReturnType<typeof setTimeout>>();
  const wrapRef                   = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(displayName); }, [displayName]);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowDrop(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, []);

  const search = (q: string) => {
    clearTimeout(timerRef.current);
    if (!q.trim()) { setResults([]); setShowDrop(false); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await patientApi.search(q, 8);
        setResults(res.data.data);
        setShowDrop(true);
      } catch { /* ignore */ }
    }, 300);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => { setQuery(e.target.value); search(e.target.value); }}
          onFocus={() => { if (results.length) setShowDrop(true); }}
          placeholder="Search patient by name or mobile..."
          leftElement={<Search className="h-4 w-4" />}
          error={error}
        />
        {value && (
          <button
            type="button"
            onClick={() => { setQuery(''); onSelect('', ''); setResults([]); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {showDrop && results.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-white shadow-lg max-h-48 overflow-y-auto">
          {results.map((p) => (
            <button
              key={p._id}
              type="button"
              onMouseDown={() => {
                onSelect(p._id, p.name);
                setQuery(p.name);
                setShowDrop(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
            >
              <span className="font-medium">{p.name}</span>
              <span className="text-muted-foreground ml-2 text-xs">{p.patientId} · {p.mobile}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Invoice Totals Panel ──────────────────────────────────────────────────────

const TotalsPanel = ({ values, isInterState }: { values: InvoiceFormValues; isInterState: boolean }) => {
  const items  = values.items ?? [];
  const totals = computeInvoiceTotals(
    items.map((i) => ({
      unitPrice: Number(i.unitPrice) || 0,
      quantity:  Number(i.quantity)  || 0,
      discount:  Number(i.discount)  || 0,
      gstRate:   Number(i.gstRate)   || 0,
    })),
    isInterState
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2 text-sm sticky top-4">
      <h3 className="font-semibold text-foreground mb-3">Invoice Summary</h3>

      <div className="flex justify-between text-muted-foreground">
        <span>Subtotal</span><span>{fmt(totals.subtotal)}</span>
      </div>
      {totals.totalDiscount > 0 && (
        <div className="flex justify-between text-muted-foreground">
          <span>Discount</span><span>- {fmt(totals.totalDiscount)}</span>
        </div>
      )}
      <div className="flex justify-between text-muted-foreground">
        <span>Taxable Amount</span><span>{fmt(totals.totalTaxableAmount)}</span>
      </div>

      {isInterState ? (
        <div className="flex justify-between text-muted-foreground">
          <span>IGST</span><span>{fmt(totals.totalIGST)}</span>
        </div>
      ) : (
        <>
          <div className="flex justify-between text-muted-foreground">
            <span>CGST</span><span>{fmt(totals.totalCGST)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>SGST</span><span>{fmt(totals.totalSGST)}</span>
          </div>
        </>
      )}

      {totals.roundOff !== 0 && (
        <div className="flex justify-between text-muted-foreground text-xs">
          <span>Round Off</span>
          <span>{totals.roundOff > 0 ? '+' : ''}{fmt(totals.roundOff)}</span>
        </div>
      )}

      <div className="border-t border-border pt-2 flex justify-between font-bold text-base">
        <span>Total</span>
        <span className="text-primary">{fmt(totals.totalAmount)}</span>
      </div>
    </div>
  );
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface InvoiceFormProps {
  mode?: 'create' | 'edit';
  defaultValues?: Partial<InvoiceFormValues>;
  defaultPatientId?: string;
  defaultPatientName?: string;
  defaultAppointmentId?: string;
  onSubmit: (payload: CreateInvoicePayload) => Promise<void>;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const InvoiceForm = ({
  mode = 'create',
  defaultValues,
  defaultPatientId = '',
  defaultPatientName = '',
  defaultAppointmentId = '',
  onSubmit,
  isSubmitting = false,
  onCancel,
}: InvoiceFormProps) => {
  const methods = useForm<InvoiceFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      patientId:          defaultPatientId,
      patientName:        defaultPatientName,
      appointmentId:      defaultAppointmentId,
      items:              [{ ...defaultItem }],
      isInterState:       false,
      clinicGstin:        '',
      patientGstin:       '',
      notes:              '',
      termsAndConditions: 'Payment due within 7 days.',
      dueDate:            '',
      ...defaultValues,
    },
  });

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = methods;
  const isInterState = watch('isInterState');
  const formValues   = watch();

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const handleFormSubmit = async (values: InvoiceFormValues) => {
    const payload: CreateInvoicePayload = {
      patientId:          values.patientId,
      appointmentId:      values.appointmentId || undefined,
      items:              values.items.map((i) => ({
        type:        i.type,
        description: i.description,
        hsnCode:     i.hsnCode || undefined,
        quantity:    Number(i.quantity),
        unitPrice:   Number(i.unitPrice),
        discount:    Number(i.discount) || 0,
        gstRate:     Number(i.gstRate)  || 0,
      })),
      isInterState:       values.isInterState,
      clinicGstin:        values.clinicGstin  || undefined,
      patientGstin:       values.patientGstin || undefined,
      notes:              values.notes              || undefined,
      termsAndConditions: values.termsAndConditions || undefined,
      dueDate:            values.dueDate            || undefined,
    };
    await onSubmit(payload);
  };

  // Quick-fill from COMMON_ITEMS
  const quickFill = (item: typeof COMMON_ITEMS[number], index: number) => {
    setValue(`items.${index}.description`, item.description);
    setValue(`items.${index}.type`,        item.type);
    setValue(`items.${index}.unitPrice`,   item.unitPrice);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: main form — 2 cols wide */}
          <div className="lg:col-span-2 space-y-4">

            {/* Patient */}
            <SectionCard title="Patient">
              <div>
                <Label>Patient</Label>
                {mode === 'edit' ? (
                  <p className="mt-1 text-sm font-medium text-foreground px-3 py-2 rounded-md border border-input bg-muted/40">
                    {watch('patientName') || defaultPatientName}
                    <span className="ml-2 text-xs text-muted-foreground">(locked — cannot change patient on an existing invoice)</span>
                  </p>
                ) : (
                  <Controller
                    name="patientId"
                    control={control}
                    render={({ field }) => (
                      <PatientSearch
                        value={field.value}
                        displayName={watch('patientName') ?? ''}
                        onSelect={(id, name) => {
                          field.onChange(id);
                          setValue('patientName', name);
                        }}
                        error={errors.patientId?.message}
                      />
                    )}
                  />
                )}
              </div>
              <div className={mode === 'edit' ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-3'}>
                {mode === 'create' && (
                  <div>
                    <Label>Appointment ID (optional)</Label>
                    <Input
                      {...register('appointmentId')}
                      placeholder="Link to appointment..."
                      className="mt-1"
                    />
                  </div>
                )}
                <div>
                  <Label>Due Date</Label>
                  <Input
                    {...register('dueDate')}
                    type="date"
                    className="mt-1"
                  />
                </div>
              </div>
            </SectionCard>

            {/* Items */}
            <SectionCard title="Invoice Items">
              {errors.items?.message && (
                <p className="text-xs text-destructive">{errors.items.message}</p>
              )}

              {/* Quick add row */}
              <div className="flex flex-wrap gap-2 pb-2">
                {COMMON_ITEMS.map((item, i) => (
                  <button
                    key={item.description}
                    type="button"
                    onClick={() => {
                      // Fill the last empty item or append new
                      const lastIdx = fields.length - 1;
                      const lastDesc = (formValues.items?.[lastIdx]?.description ?? '').trim();
                      if (!lastDesc) {
                        quickFill(item, lastIdx);
                      } else {
                        append({ ...defaultItem });
                        setTimeout(() => quickFill(item, fields.length), 0);
                      }
                    }}
                    className="text-xs px-2 py-1 rounded border border-border hover:bg-accent transition-colors"
                  >
                    + {item.description}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <InvoiceItemRow
                    key={field.id}
                    index={index}
                    onRemove={() => remove(index)}
                    canRemove={fields.length > 1}
                    isInterState={isInterState}
                  />
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ ...defaultItem })}
                className="mt-1"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Item
              </Button>
            </SectionCard>

            {/* GST */}
            <SectionCard title="GST & Tax Details">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="interState"
                  {...register('isInterState')}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <Label htmlFor="interState" className="cursor-pointer">
                  Inter-state supply (IGST applies instead of CGST + SGST)
                </Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Clinic GSTIN</Label>
                  <Input
                    {...register('clinicGstin')}
                    placeholder="22AAAAA0000A1Z5"
                    className="mt-1 uppercase"
                  />
                </div>
                <div>
                  <Label>Patient GSTIN (optional)</Label>
                  <Input
                    {...register('patientGstin')}
                    placeholder="Patient GSTIN if applicable"
                    className="mt-1 uppercase"
                  />
                </div>
              </div>
            </SectionCard>

            {/* Notes */}
            <SectionCard title="Notes & Terms">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Notes</Label>
                  <textarea
                    {...register('notes')}
                    rows={2}
                    placeholder="Internal notes..."
                    className="mt-1 flex min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>
                <div>
                  <Label>Terms & Conditions</Label>
                  <textarea
                    {...register('termsAndConditions')}
                    rows={2}
                    placeholder="Payment due within 7 days."
                    className="mt-1 flex min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>
              </div>
            </SectionCard>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
              )}
              <Button type="submit" isLoading={isSubmitting}>
                {mode === 'edit' ? 'Update Invoice' : 'Generate Invoice'}
              </Button>
            </div>
          </div>

          {/* Right: totals sticky panel */}
          <div className="lg:col-span-1">
            <TotalsPanel values={formValues} isInterState={isInterState} />
          </div>
        </div>
      </form>
    </FormProvider>
  );
};
