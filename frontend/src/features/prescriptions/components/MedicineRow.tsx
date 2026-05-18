import { useFormContext, Controller } from 'react-hook-form';
import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import {
  FREQ_OPTIONS, UNIT_OPTIONS, ROUTE_OPTIONS,
  MEDICINE_INSTRUCTIONS, FREQ_TIMES_PER_DAY, DURATION_UNITS,
} from '@/constants/prescription';
import type { PrescriptionFormValues } from './PrescriptionForm';

interface MedicineRowProps {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}

const INSTRUCTION_OPTIONS = MEDICINE_INSTRUCTIONS.map((i) => ({ value: i, label: i }));

export const MedicineRow = ({ index, onRemove, canRemove }: MedicineRowProps) => {
  const { register, control, watch, formState: { errors } } = useFormContext<PrescriptionFormValues>();

  const frequency    = watch(`medicines.${index}.frequency`);
  const durationValue = watch(`medicines.${index}.durationValue`);
  const durationUnit  = watch(`medicines.${index}.durationUnit`);

  const dv = Number(durationValue) || 0;
  const durationDays =
    durationUnit === 'days' ? dv :
    durationUnit === 'weeks' ? dv * 7 :
    dv * 30;
  const freqPerDay = FREQ_TIMES_PER_DAY[frequency] ?? 1;
  const autoQty = durationDays > 0 ? freqPerDay * durationDays : 0;

  const me = errors.medicines?.[index];

  return (
    <div className="grid grid-cols-12 gap-x-2 gap-y-2 p-3 rounded-lg border border-border bg-muted/20">
      {/* Header row */}
      <div className="col-span-12 flex justify-between items-center">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Medicine #{index + 1}
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

      {/* Name */}
      <div className="col-span-6">
        <Label className="text-xs mb-1">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          {...register(`medicines.${index}.name`)}
          placeholder="e.g., Paracetamol"
          className="h-8 text-sm"
          error={me?.name?.message}
        />
      </div>

      {/* Generic name */}
      <div className="col-span-6">
        <Label className="text-xs mb-1">Generic Name</Label>
        <Input
          {...register(`medicines.${index}.genericName`)}
          placeholder="e.g., Acetaminophen"
          className="h-8 text-sm"
        />
      </div>

      {/* Dosage */}
      <div className="col-span-3">
        <Label className="text-xs mb-1">
          Dosage <span className="text-destructive">*</span>
        </Label>
        <Input
          {...register(`medicines.${index}.dosage`)}
          placeholder="500mg"
          className="h-8 text-sm"
          error={me?.dosage?.message}
        />
      </div>

      {/* Frequency */}
      <div className="col-span-3">
        <Label className="text-xs mb-1">
          Frequency <span className="text-destructive">*</span>
        </Label>
        <Controller
          name={`medicines.${index}.frequency`}
          control={control}
          render={({ field }) => (
            <Select
              options={FREQ_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              className="h-8 text-sm"
              error={me?.frequency?.message}
            />
          )}
        />
      </div>

      {/* Duration value */}
      <div className="col-span-2">
        <Label className="text-xs mb-1">For</Label>
        <Input
          {...register(`medicines.${index}.durationValue`)}
          type="number"
          min={1}
          placeholder="5"
          className="h-8 text-sm"
        />
      </div>

      {/* Duration unit */}
      <div className="col-span-2">
        <Label className="text-xs mb-1">&nbsp;</Label>
        <Controller
          name={`medicines.${index}.durationUnit`}
          control={control}
          render={({ field }) => (
            <Select
              options={DURATION_UNITS.map((d) => ({ value: d.value, label: d.label }))}
              value={field.value}
              onChange={field.onChange}
              className="h-8 text-sm"
            />
          )}
        />
      </div>

      {/* Quantity */}
      <div className="col-span-2">
        <Label className="text-xs mb-1">Qty</Label>
        <Input
          {...register(`medicines.${index}.quantity`)}
          type="number"
          min={0}
          placeholder={autoQty > 0 ? String(autoQty) : '—'}
          className="h-8 text-sm"
        />
        {autoQty > 0 && (
          <p className="text-[10px] text-muted-foreground mt-0.5">calc: {autoQty}</p>
        )}
      </div>

      {/* Unit */}
      <div className="col-span-4">
        <Label className="text-xs mb-1">
          Form <span className="text-destructive">*</span>
        </Label>
        <Controller
          name={`medicines.${index}.unit`}
          control={control}
          render={({ field }) => (
            <Select
              options={UNIT_OPTIONS}
              value={field.value}
              onChange={field.onChange}
              className="h-8 text-sm"
              error={me?.unit?.message}
            />
          )}
        />
      </div>

      {/* Route */}
      <div className="col-span-4">
        <Label className="text-xs mb-1">Route</Label>
        <Controller
          name={`medicines.${index}.route`}
          control={control}
          render={({ field }) => (
            <Select
              options={ROUTE_OPTIONS}
              value={field.value ?? ''}
              onChange={field.onChange}
              className="h-8 text-sm"
            />
          )}
        />
      </div>

      {/* Instructions */}
      <div className="col-span-4">
        <Label className="text-xs mb-1">Instructions</Label>
        <Controller
          name={`medicines.${index}.instructions`}
          control={control}
          render={({ field }) => (
            <Select
              options={[{ value: '', label: '— None —' }, ...INSTRUCTION_OPTIONS]}
              value={field.value ?? ''}
              onChange={field.onChange}
              className="h-8 text-sm"
            />
          )}
        />
      </div>
    </div>
  );
};
