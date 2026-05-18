import { useFormContext, Controller } from 'react-hook-form';
import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ITEM_TYPE_OPTIONS, GST_RATE_OPTIONS, COMMON_ITEMS } from '@/constants/billing';
import { computeItemAmounts } from '@/services/billing.service';
import type { InvoiceFormValues } from './InvoiceForm';

interface InvoiceItemRowProps {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
  isInterState: boolean;
}

const fmt = (n: number) => `₹${n.toFixed(2)}`;

export const InvoiceItemRow = ({ index, onRemove, canRemove, isInterState }: InvoiceItemRowProps) => {
  const { register, control, watch, formState: { errors } } = useFormContext<InvoiceFormValues>();

  const unitPrice = Number(watch(`items.${index}.unitPrice`)) || 0;
  const quantity  = Number(watch(`items.${index}.quantity`))  || 0;
  const discount  = Number(watch(`items.${index}.discount`))  || 0;
  const gstRate   = Number(watch(`items.${index}.gstRate`))   || 0;

  const computed = computeItemAmounts(unitPrice, quantity, discount, gstRate, isInterState);

  // sync computed quantity * unitPrice into a display field (no field needed — just display)

  const ie = errors.items?.[index];

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
      {/* Row header */}
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Item #{index + 1}
        </span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-12 gap-2">
        {/* Type */}
        <div className="col-span-3">
          <Label className="text-xs mb-1">
            Type <span className="text-destructive">*</span>
          </Label>
          <Controller
            name={`items.${index}.type`}
            control={control}
            render={({ field }) => (
              <Select
                options={ITEM_TYPE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                className="h-8 text-sm"
                error={ie?.type?.message}
              />
            )}
          />
        </div>

        {/* Description */}
        <div className="col-span-9">
          <Label className="text-xs mb-1">
            Description <span className="text-destructive">*</span>
          </Label>
          <Input
            {...register(`items.${index}.description`)}
            placeholder="e.g., Consultation Fee"
            className="h-8 text-sm"
            error={ie?.description?.message}
            list={`item-desc-${index}`}
          />
          <datalist id={`item-desc-${index}`}>
            {COMMON_ITEMS.map((c) => (
              <option key={c.description} value={c.description} />
            ))}
          </datalist>
        </div>

        {/* Qty */}
        <div className="col-span-2">
          <Label className="text-xs mb-1">Qty</Label>
          <Input
            {...register(`items.${index}.quantity`)}
            type="number"
            min={0.01}
            step={0.01}
            className="h-8 text-sm"
            error={ie?.quantity?.message}
          />
        </div>

        {/* Unit Price */}
        <div className="col-span-3">
          <Label className="text-xs mb-1">
            Unit Price (₹) <span className="text-destructive">*</span>
          </Label>
          <Input
            {...register(`items.${index}.unitPrice`)}
            type="number"
            min={0}
            step={0.01}
            className="h-8 text-sm"
            error={ie?.unitPrice?.message}
          />
        </div>

        {/* Discount */}
        <div className="col-span-3">
          <Label className="text-xs mb-1">Discount (₹)</Label>
          <Input
            {...register(`items.${index}.discount`)}
            type="number"
            min={0}
            step={0.01}
            defaultValue={0}
            className="h-8 text-sm"
          />
        </div>

        {/* GST Rate */}
        <div className="col-span-2">
          <Label className="text-xs mb-1">GST %</Label>
          <Controller
            name={`items.${index}.gstRate`}
            control={control}
            render={({ field }) => (
              <Select
                options={GST_RATE_OPTIONS}
                value={String(field.value)}
                onChange={(e) => field.onChange(Number(e.target.value))}
                className="h-8 text-sm"
              />
            )}
          />
        </div>

        {/* HSN Code */}
        <div className="col-span-2">
          <Label className="text-xs mb-1">HSN/SAC</Label>
          <Input
            {...register(`items.${index}.hsnCode`)}
            placeholder="9983"
            className="h-8 text-sm"
          />
        </div>
      </div>

      {/* Computed amounts row */}
      <div className="grid grid-cols-4 gap-2 pt-1 border-t border-border/50 text-xs">
        <div className="text-center">
          <span className="text-muted-foreground">Taxable</span>
          <p className="font-semibold">{fmt(computed.taxableAmount)}</p>
        </div>
        {isInterState ? (
          <div className="col-span-2 text-center">
            <span className="text-muted-foreground">IGST ({gstRate}%)</span>
            <p className="font-semibold">{fmt(computed.igstAmount)}</p>
          </div>
        ) : (
          <>
            <div className="text-center">
              <span className="text-muted-foreground">CGST ({gstRate / 2}%)</span>
              <p className="font-semibold">{fmt(computed.cgstAmount)}</p>
            </div>
            <div className="text-center">
              <span className="text-muted-foreground">SGST ({gstRate / 2}%)</span>
              <p className="font-semibold">{fmt(computed.sgstAmount)}</p>
            </div>
          </>
        )}
        <div className="text-center bg-primary/5 rounded px-2 py-0.5">
          <span className="text-muted-foreground">Line Total</span>
          <p className="font-bold text-primary">{fmt(computed.totalAmount)}</p>
        </div>
      </div>
    </div>
  );
};
