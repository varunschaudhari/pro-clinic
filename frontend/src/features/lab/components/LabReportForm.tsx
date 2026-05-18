import { useFieldArray, useForm, FormProvider, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';

import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { LabResultRow } from './LabResultRow';
import { TEST_CATEGORY_OPTIONS, SAMPLE_TYPE_OPTIONS } from '@/constants/labReport';
import { COMMON_LAB_TESTS } from '@/constants/prescription';
import type { CreateLabReportPayload, UpdateLabReportPayload } from '@/services/labReport.service';

// ── Schema ────────────────────────────────────────────────────────────────────

const resultSchema = z.object({
  parameter:      z.string().trim().min(1, 'Required'),
  value:          z.string().trim().min(1, 'Required'),
  unit:           z.string().trim().optional(),
  referenceRange: z.string().trim().optional(),
  isAbnormal:     z.boolean().default(false),
  flags:          z.enum(['H', 'L', 'HH', 'LL', 'A']).optional(),
});

const schema = z.object({
  testName:          z.string().trim().min(1, 'Test name required'),
  testCategory:      z.string().optional(),
  labName:           z.string().trim().max(200).optional(),
  labAddress:        z.string().trim().max(500).optional(),
  labContactNo:      z.string().trim().max(20).optional(),
  sampleType:        z.string().optional(),
  sampleCollectedAt: z.string().optional(),
  reportDate:        z.string().optional(),
  results:           z.array(resultSchema),
  interpretation:    z.string().trim().max(2000).optional(),
  remarks:           z.string().trim().max(1000).optional(),
  doctorComment:     z.string().trim().max(1000).optional(),
  fileUrls:          z.array(z.string()),
  newFileUrl:        z.string().optional(), // transient field for URL input
});

export type LabReportFormValues = z.infer<typeof schema>;

// ── Defaults ──────────────────────────────────────────────────────────────────

const defaultResult: LabReportFormValues['results'][0] = {
  parameter:      '',
  value:          '',
  unit:           '',
  referenceRange: '',
  isAbnormal:     false,
  flags:          undefined,
};

const todayStr = () => new Date().toISOString().slice(0, 10);

// ── Section Card ──────────────────────────────────────────────────────────────

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    {children}
  </div>
);

// ── Props ─────────────────────────────────────────────────────────────────────

interface LabReportFormProps {
  defaultValues?: Partial<LabReportFormValues>;
  defaultTestName?: string;
  onSubmit: (payload: CreateLabReportPayload | UpdateLabReportPayload) => Promise<void>;
  isEdit?: boolean;
  patientId?: string;
  appointmentId?: string;
  prescriptionId?: string;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const LabReportForm = ({
  defaultValues,
  defaultTestName = '',
  onSubmit,
  isEdit = false,
  patientId,
  appointmentId,
  prescriptionId,
  isSubmitting = false,
  onCancel,
}: LabReportFormProps) => {
  const methods = useForm<LabReportFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      testName:          defaultTestName,
      testCategory:      '',
      labName:           '',
      labAddress:        '',
      labContactNo:      '',
      sampleType:        '',
      sampleCollectedAt: '',
      reportDate:        todayStr(),
      results:           [],
      interpretation:    '',
      remarks:           '',
      doctorComment:     '',
      fileUrls:          [],
      newFileUrl:        '',
      ...defaultValues,
    },
  });

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = methods;

  const { fields, append, remove } = useFieldArray({ control, name: 'results' });
  const fileUrls  = watch('fileUrls');
  const newFileUrl = watch('newFileUrl');

  const addFileUrl = () => {
    const url = (newFileUrl ?? '').trim();
    if (url && !fileUrls.includes(url)) {
      setValue('fileUrls', [...fileUrls, url]);
      setValue('newFileUrl', '');
    }
  };

  const removeFileUrl = (idx: number) => {
    setValue('fileUrls', fileUrls.filter((_, i) => i !== idx));
  };

  const handleFormSubmit = async (values: LabReportFormValues) => {
    const payload: CreateLabReportPayload | UpdateLabReportPayload = {
      ...(isEdit ? {} : { patientId: patientId! }),
      appointmentId:     appointmentId  || undefined,
      prescriptionId:    prescriptionId || undefined,
      testName:          values.testName,
      testCategory:      values.testCategory  || undefined,
      labName:           values.labName        || undefined,
      labAddress:        values.labAddress     || undefined,
      labContactNo:      values.labContactNo   || undefined,
      sampleType:        values.sampleType     || undefined,
      sampleCollectedAt: values.sampleCollectedAt || undefined,
      reportDate:        values.reportDate       || undefined,
      results:           values.results.filter((r) => r.parameter.trim() && r.value.trim()),
      interpretation:    values.interpretation  || undefined,
      remarks:           values.remarks          || undefined,
      doctorComment:     values.doctorComment    || undefined,
      fileUrls:          values.fileUrls,
    };
    await onSubmit(payload);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">

        {/* Test details */}
        <SectionCard title="Test Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>
                Test Name <span className="text-destructive">*</span>
              </Label>
              <Input
                {...register('testName')}
                placeholder="e.g., Complete Blood Count (CBC)"
                className="mt-1"
                error={errors.testName?.message}
                list="test-name-list"
              />
              <datalist id="test-name-list">
                {COMMON_LAB_TESTS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>
            <div>
              <Label>Category</Label>
              <Controller
                name="testCategory"
                control={control}
                render={({ field }) => (
                  <Select
                    options={[{ value: '', label: '— Select —' }, ...TEST_CATEGORY_OPTIONS]}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    className="mt-1"
                  />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Lab Name</Label>
              <Input {...register('labName')} placeholder="e.g., Dr. Lal PathLabs" className="mt-1" />
            </div>
            <div>
              <Label>Lab Contact</Label>
              <Input {...register('labContactNo')} placeholder="Phone number" className="mt-1" />
            </div>
            <div>
              <Label>Sample Type</Label>
              <Controller
                name="sampleType"
                control={control}
                render={({ field }) => (
                  <Select
                    options={[{ value: '', label: '— Select —' }, ...SAMPLE_TYPE_OPTIONS]}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    className="mt-1"
                  />
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Sample Collected At</Label>
              <Input
                {...register('sampleCollectedAt')}
                type="date"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Report Date</Label>
              <Input
                {...register('reportDate')}
                type="date"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Lab Address</Label>
            <Input {...register('labAddress')} placeholder="Lab address (optional)" className="mt-1" />
          </div>
        </SectionCard>

        {/* Results table */}
        <SectionCard title="Test Results">
          {/* Column headers */}
          {fields.length > 0 && (
            <div className="grid grid-cols-12 gap-x-2 px-3 pb-1 text-xs text-muted-foreground font-medium">
              <div className="col-span-3">Parameter</div>
              <div className="col-span-2">Value</div>
              <div className="col-span-2">Unit</div>
              <div className="col-span-3">Reference Range</div>
              <div className="col-span-1">Flag</div>
              <div className="col-span-1" />
            </div>
          )}

          <div className="space-y-1.5">
            {fields.map((field, index) => (
              <LabResultRow
                key={field.id}
                index={index}
                onRemove={() => remove(index)}
                canRemove={fields.length > 0}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ ...defaultResult })}
            className="mt-1"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Result Row
          </Button>
        </SectionCard>

        {/* Interpretation & Notes */}
        <SectionCard title="Interpretation & Comments">
          <div>
            <Label>Interpretation</Label>
            <textarea
              {...register('interpretation')}
              rows={3}
              placeholder="Lab interpretation text..."
              className="mt-1 flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Remarks</Label>
              <textarea
                {...register('remarks')}
                rows={2}
                placeholder="Additional remarks..."
                className="mt-1 flex min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div>
              <Label>Doctor Comment (Internal)</Label>
              <textarea
                {...register('doctorComment')}
                rows={2}
                placeholder="Doctor's notes on this report..."
                className="mt-1 flex min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>
        </SectionCard>

        {/* File URLs */}
        <SectionCard title="Report Files (PDF / Image URLs)">
          <div className="flex gap-2">
            <Input
              {...register('newFileUrl')}
              placeholder="https://... (paste PDF or image URL)"
              className="flex-1"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFileUrl(); } }}
            />
            <Button type="button" variant="outline" onClick={addFileUrl}>
              Add
            </Button>
          </div>
          {fileUrls.length > 0 && (
            <ul className="space-y-1 mt-2">
              {fileUrls.map((url, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate flex-1 text-xs"
                  >
                    {url}
                  </a>
                  <button
                    type="button"
                    onClick={() => removeFileUrl(i)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? 'Update Report' : 'Save Report'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
};
