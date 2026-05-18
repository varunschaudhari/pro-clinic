import { useFormContext, Controller } from 'react-hook-form';
import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FLAG_OPTIONS } from '@/constants/labReport';
import type { LabReportFormValues } from './LabReportForm';

interface LabResultRowProps {
  index: number;
  onRemove: () => void;
  canRemove: boolean;
}

export const LabResultRow = ({ index, onRemove, canRemove }: LabResultRowProps) => {
  const { register, control, watch, setValue, formState: { errors } } = useFormContext<LabReportFormValues>();

  const isAbnormal = watch(`results.${index}.isAbnormal`) ?? false;

  // Auto-set isAbnormal when a flag is chosen
  const handleFlagsChange = (val: string) => {
    setValue(`results.${index}.flags`,      (val || undefined) as any);
    setValue(`results.${index}.isAbnormal`, val !== '');
  };

  const re = errors.results?.[index];

  return (
    <div className={`grid grid-cols-12 gap-x-2 gap-y-1 px-3 py-2 rounded border ${isAbnormal ? 'border-orange-200 bg-orange-50/30' : 'border-border bg-muted/10'}`}>
      {/* Parameter */}
      <div className="col-span-3">
        <Input
          {...register(`results.${index}.parameter`)}
          placeholder="e.g., Haemoglobin"
          className="h-8 text-sm"
          error={re?.parameter?.message}
        />
      </div>

      {/* Value */}
      <div className="col-span-2">
        <Input
          {...register(`results.${index}.value`)}
          placeholder="13.5"
          className="h-8 text-sm"
          error={re?.value?.message}
        />
      </div>

      {/* Unit */}
      <div className="col-span-2">
        <Input
          {...register(`results.${index}.unit`)}
          placeholder="g/dL"
          className="h-8 text-sm"
        />
      </div>

      {/* Reference Range */}
      <div className="col-span-3">
        <Input
          {...register(`results.${index}.referenceRange`)}
          placeholder="12.0 – 17.0"
          className="h-8 text-sm"
        />
      </div>

      {/* Flags */}
      <div className="col-span-1">
        <Controller
          name={`results.${index}.flags`}
          control={control}
          render={({ field }) => (
            <select
              value={field.value ?? ''}
              onChange={(e) => handleFlagsChange(e.target.value)}
              className={`flex h-8 w-full appearance-none rounded-md border px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                field.value ? 'border-orange-300 bg-orange-50 text-orange-700 font-bold' : 'border-input bg-background'
              }`}
            >
              {FLAG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.value || '—'}</option>
              ))}
            </select>
          )}
        />
      </div>

      {/* Remove */}
      <div className="col-span-1 flex items-center justify-center">
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
};
