import { useState } from 'react';
import { useFieldArray, useForm, FormProvider, Controller } from 'react-hook-form';
import type { UseFormRegister, Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookTemplate, Plus, Save } from 'lucide-react';

import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { TagInput } from '@/components/ui/TagInput';
import { MedicineRow } from './MedicineRow';
import { TemplatePicker } from './TemplatePicker';
import { SaveTemplateModal } from './SaveTemplateModal';
import {
  COMMON_DIAGNOSES, COMMON_LAB_TESTS,
  FREQ_TIMES_PER_DAY,
} from '@/constants/prescription';
import type { CreatePrescriptionPayload, UpdatePrescriptionPayload } from '@/services/prescription.service';
import type { TemplateMedicine } from '@/services/prescriptionTemplate.service';

// ── Schema ─────────────────────────────────────────────────────────────────────

const medicineSchema = z.object({
  name:          z.string().trim().min(1, 'Name required'),
  genericName:   z.string().trim().optional(),
  dosage:        z.string().trim().min(1, 'Dosage required'),
  frequency:     z.string().min(1, 'Frequency required'),
  durationValue: z.string().optional(),
  durationUnit:  z.enum(['days', 'weeks', 'months']),
  unit:          z.string().min(1, 'Form required'),
  route:         z.string().optional(),
  instructions:  z.string().optional(),
  quantity:      z.string().optional(),
});

const labTestSchema = z.object({
  name:    z.string().trim().min(1, 'Test name required'),
  urgency: z.enum(['routine', 'urgent', 'stat']).default('routine'),
  notes:   z.string().trim().optional(),
});

const schema = z.object({
  diagnosis:            z.array(z.string()).min(1, 'Add at least one diagnosis'),
  icdCodes:             z.array(z.string()),
  medicines:            z.array(medicineSchema).min(1, 'Add at least one medicine'),
  labTests:             z.array(labTestSchema),
  procedures:           z.array(z.string()),
  advice:               z.string().trim().max(1000).optional(),
  dietAdvice:           z.string().trim().max(500).optional(),
  followUpDate:         z.string().optional(),
  followUpInstructions: z.string().trim().max(300).optional(),
  doctorNotes:          z.string().trim().max(1000).optional(),
});

export type PrescriptionFormValues = z.infer<typeof schema>;

// ── Defaults ──────────────────────────────────────────────────────────────────

const defaultMedicine: PrescriptionFormValues['medicines'][0] = {
  name:          '',
  genericName:   '',
  dosage:        '',
  frequency:     'OD',
  durationValue: '5',
  durationUnit:  'days',
  unit:          'tablet',
  route:         'oral',
  instructions:  '',
  quantity:      '',
};

const defaultLabTest: PrescriptionFormValues['labTests'][0] = {
  name:    '',
  urgency: 'routine',
  notes:   '',
};

// ── Section card ──────────────────────────────────────────────────────────────

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    {children}
  </div>
);

// ── Lab Test Row ───────────────────────────────────────────────────────────────

interface LabTestRowProps {
  index: number;
  onRemove: () => void;
  register: UseFormRegister<PrescriptionFormValues>;
  control: Control<PrescriptionFormValues>;
}

const LabTestRow = ({ index, onRemove, register, control }: LabTestRowProps) => {
  const [inputVal, setInputVal] = useState('');
  const [showSug, setShowSug] = useState(false);

  const filtered = COMMON_LAB_TESTS.filter(
    (t) => t.toLowerCase().includes(inputVal.toLowerCase())
  );

  return (
    <div className="grid grid-cols-12 gap-2 items-end p-2 rounded border border-border bg-muted/20">
      <div className="col-span-5">
        <Label className="text-xs mb-1">
          Test Name <span className="text-destructive">*</span>
        </Label>
        <Controller
          name={`labTests.${index}.name`}
          control={control}
          render={({ field }) => (
            <div className="relative">
              <Input
                value={inputVal || field.value}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  field.onChange(e.target.value);
                  setShowSug(true);
                }}
                onFocus={() => { setInputVal(field.value); setShowSug(true); }}
                onBlur={() => setTimeout(() => setShowSug(false), 150)}
                placeholder="Search test..."
                className="h-8 text-sm"
              />
              {showSug && filtered.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-border bg-white shadow-lg">
                  {filtered.slice(0, 8).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onMouseDown={() => {
                        setInputVal(t);
                        field.onChange(t);
                        setShowSug(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        />
      </div>

      <div className="col-span-3">
        <Label className="text-xs mb-1">Urgency</Label>
        <Controller
          name={`labTests.${index}.urgency`}
          control={control}
          render={({ field }) => (
            <select
              value={field.value}
              onChange={field.onChange}
              className="flex h-8 w-full appearance-none rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="routine">Routine</option>
              <option value="urgent">Urgent</option>
              <option value="stat">STAT</option>
            </select>
          )}
        />
      </div>

      <div className="col-span-3">
        <Label className="text-xs mb-1">Notes</Label>
        <Input
          {...register(`labTests.${index}.notes`)}
          placeholder="Optional..."
          className="h-8 text-sm"
        />
      </div>

      <div className="col-span-1 flex justify-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
        >
          ×
        </Button>
      </div>
    </div>
  );
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface PrescriptionFormProps {
  defaultValues?: Partial<PrescriptionFormValues>;
  onSubmit: (payload: CreatePrescriptionPayload | UpdatePrescriptionPayload) => Promise<void>;
  isEdit?: boolean;
  appointmentId?: string;
  isSubmitting?: boolean;
  onCancel?: () => void;
  userRole?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const PrescriptionForm = ({
  defaultValues,
  onSubmit,
  isEdit = false,
  appointmentId,
  isSubmitting = false,
  onCancel,
  userRole,
}: PrescriptionFormProps) => {
  const [showPicker, setShowPicker]         = useState(false);
  const [showSaveModal, setShowSaveModal]   = useState(false);

  const methods = useForm<PrescriptionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      diagnosis:            [],
      icdCodes:             [],
      medicines:            [{ ...defaultMedicine }],
      labTests:             [],
      procedures:           [],
      advice:               '',
      dietAdvice:           '',
      followUpDate:         '',
      followUpInstructions: '',
      doctorNotes:          '',
      ...defaultValues,
    },
  });

  const { register, control, handleSubmit, formState: { errors } } = methods;

  const {
    fields: medicineFields,
    append: appendMedicine,
    remove: removeMedicine,
    replace: replaceMedicines,
  } = useFieldArray({ control, name: 'medicines' });

  const handleLoadTemplate = (
    medicines: TemplateMedicine[],
    advice?: string,
    dietAdvice?: string
  ) => {
    replaceMedicines(
      medicines.map((m) => ({
        name:          m.name,
        genericName:   m.genericName ?? '',
        dosage:        m.dosage,
        frequency:     m.frequency,
        durationValue: m.durationValue ?? '5',
        durationUnit:  m.durationUnit,
        unit:          m.unit,
        route:         m.route ?? 'oral',
        instructions:  m.instructions ?? '',
        quantity:      m.quantity ?? '',
      }))
    );
    if (advice)     methods.setValue('advice', advice);
    if (dietAdvice) methods.setValue('dietAdvice', dietAdvice);
  };

  const {
    fields: labFields,
    append: appendLab,
    remove: removeLab,
  } = useFieldArray({ control, name: 'labTests' });

  const handleFormSubmit = async (values: PrescriptionFormValues) => {
    const medicines = values.medicines.map((m) => {
      const dv = Number(m.durationValue) || 1;
      const durationDays =
        m.durationUnit === 'days' ? dv :
        m.durationUnit === 'weeks' ? dv * 7 :
        dv * 30;
      const duration  = `${dv} ${m.durationUnit}`;
      const freqPerDay = FREQ_TIMES_PER_DAY[m.frequency] ?? 1;
      const quantity   = m.quantity ? Number(m.quantity) : freqPerDay * durationDays;
      return {
        name:         m.name,
        genericName:  m.genericName || undefined,
        dosage:       m.dosage,
        frequency:    m.frequency,
        duration,
        durationDays,
        unit:         m.unit,
        route:        m.route || undefined,
        instructions: m.instructions || undefined,
        quantity:     quantity || undefined,
      };
    });

    const labTests = values.labTests
      .filter((t) => t.name.trim())
      .map((t) => ({ name: t.name, urgency: t.urgency, notes: t.notes || undefined }));

    const payload: CreatePrescriptionPayload | UpdatePrescriptionPayload = {
      ...(isEdit ? {} : { appointmentId: appointmentId! }),
      diagnosis:            values.diagnosis,
      icdCodes:             values.icdCodes.length > 0 ? values.icdCodes : undefined,
      medicines,
      labTests:             labTests.length > 0 ? labTests : undefined,
      procedures:           values.procedures.length > 0 ? values.procedures : undefined,
      advice:               values.advice || undefined,
      dietAdvice:           values.dietAdvice || undefined,
      followUpDate:         values.followUpDate || undefined,
      followUpInstructions: values.followUpInstructions || undefined,
      doctorNotes:          values.doctorNotes || undefined,
    };

    await onSubmit(payload);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">

        {/* Diagnosis */}
        <SectionCard title="Diagnosis">
          <div>
            <Label>
              Diagnosis <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="diagnosis"
              control={control}
              render={({ field }) => (
                <TagInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Type or select a diagnosis..."
                  suggestions={COMMON_DIAGNOSES}
                  error={errors.diagnosis?.message ?? (errors.diagnosis as any)?.[0]?.message}
                  className="mt-1"
                />
              )}
            />
          </div>
          <div>
            <Label>ICD-10 Codes (Optional)</Label>
            <Controller
              name="icdCodes"
              control={control}
              render={({ field }) => (
                <TagInput
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="e.g., J06.9, E11..."
                  className="mt-1"
                />
              )}
            />
          </div>
        </SectionCard>

        {/* Medicines */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Medicines</h3>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowPicker(true)}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                <BookTemplate className="h-3.5 w-3.5 mr-1" />
                Load Template
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowSaveModal(true)}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                disabled={medicineFields.length === 0}
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                Save as Template
              </Button>
            </div>
          </div>

          {errors.medicines?.message && (
            <p className="text-xs text-destructive">{errors.medicines.message}</p>
          )}
          <div className="space-y-3">
            {medicineFields.map((field, index) => (
              <MedicineRow
                key={field.id}
                index={index}
                onRemove={() => removeMedicine(index)}
                canRemove={medicineFields.length > 1}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendMedicine({ ...defaultMedicine })}
            className="mt-1"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Medicine
          </Button>
        </div>

        {/* Lab Tests */}
        <SectionCard title="Lab Tests (Optional)">
          <div className="space-y-2">
            {labFields.map((field, index) => (
              <LabTestRow
                key={field.id}
                index={index}
                onRemove={() => removeLab(index)}
                register={register}
                control={control}
              />
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendLab({ ...defaultLabTest })}
            className="mt-1"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Lab Test
          </Button>
        </SectionCard>

        {/* Procedures */}
        <SectionCard title="Procedures (Optional)">
          <Controller
            name="procedures"
            control={control}
            render={({ field }) => (
              <TagInput
                value={field.value}
                onChange={field.onChange}
                placeholder="Type procedure and press Enter..."
              />
            )}
          />
        </SectionCard>

        {/* Advice */}
        <SectionCard title="Advice & Instructions">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>General Advice</Label>
              <textarea
                {...register('advice')}
                rows={3}
                placeholder="Drink plenty of water, rest..."
                className="mt-1 flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
            <div>
              <Label>Diet Advice</Label>
              <textarea
                {...register('dietAdvice')}
                rows={3}
                placeholder="Avoid spicy food, low sodium diet..."
                className="mt-1 flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>
        </SectionCard>

        {/* Follow-up */}
        <SectionCard title="Follow-up">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Follow-up Date</Label>
              <Input
                {...register('followUpDate')}
                type="date"
                className="mt-1"
                min={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div>
              <Label>Follow-up Instructions</Label>
              <Input
                {...register('followUpInstructions')}
                placeholder="Review after 1 week..."
                className="mt-1"
              />
            </div>
          </div>
        </SectionCard>

        {/* Doctor notes */}
        <SectionCard title="Doctor Notes (Internal — not printed)">
          <textarea
            {...register('doctorNotes')}
            rows={2}
            placeholder="Internal notes for clinic use only..."
            className="flex min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </SectionCard>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? 'Update Prescription' : 'Save Prescription'}
          </Button>
        </div>
      </form>

      <TemplatePicker
        open={showPicker}
        onClose={() => setShowPicker(false)}
        onLoad={handleLoadTemplate}
      />

      <SaveTemplateModal
        open={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        medicines={medicineFields.map((f) => ({
          name:          f.name,
          genericName:   f.genericName,
          dosage:        f.dosage,
          frequency:     f.frequency,
          durationValue: f.durationValue,
          durationUnit:  f.durationUnit,
          unit:          f.unit,
          route:         f.route,
          instructions:  f.instructions,
          quantity:      f.quantity,
        }))}
        advice={methods.watch('advice')}
        dietAdvice={methods.watch('dietAdvice')}
        isClinicAdmin={userRole === 'ClinicAdmin'}
        onSaved={() => {}}
      />
    </FormProvider>
  );
};
