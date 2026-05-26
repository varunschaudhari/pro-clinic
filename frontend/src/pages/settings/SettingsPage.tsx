import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Upload } from 'lucide-react';

import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { clinicApi } from '@/services/clinic.service';
import type { ClinicDoc } from '@/services/clinic.service';
import { setClinic } from '@/features/clinic/clinicSlice';
import { updateUser } from '@/features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { getErrorMessage } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────

const CLINIC_TYPES = [
  'General Medicine', 'Dental', 'Dermatology', 'Pediatrics', 'Orthopaedics',
  'Gynaecology', 'ENT', 'Ophthalmology', 'Multi-Specialty',
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
  'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli and Daman and Diu',
  'Lakshadweep',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  name:               z.string().trim().min(1, 'Name required'),
  type:               z.string().min(1),
  registrationNumber: z.string().trim().optional(),
  gstin:              z.string().trim().optional(),
  logoUrl:            z.string().trim().optional(),
  mobile:             z.string().trim().min(10, 'Invalid mobile'),
  alternateMobile:    z.string().trim().optional(),
  email:              z.string().email('Invalid email'),
  website:            z.string().trim().optional(),
  addressLine1:       z.string().trim().min(1, 'Address required'),
  addressLine2:       z.string().trim().optional(),
  city:               z.string().trim().min(1, 'City required'),
  state:              z.string().min(1, 'State required'),
  pincode:            z.string().regex(/^\d{6}$/, 'Invalid 6-digit pincode'),
  appointmentDuration:z.coerce.number().int().min(5).max(120),
  workingDays:        z.array(z.number()),
  workingHoursStart:  z.string(),
  workingHoursEnd:    z.string(),
  pharmacyGstin:         z.string().trim().optional(),
  tokenPrefix:           z.string().trim().max(5),
  invoicePrefix:         z.string().trim().max(10),
  pharmacyInvoicePrefix: z.string().trim().max(10),
  patientIdPrefix:       z.string().trim().max(5),
  printHeader:        z.string().trim().max(200).optional(),
  printFooter:        z.string().trim().max(500).optional(),
  // Feature toggles
  enableSMS:           z.boolean(),
  enableWhatsApp:      z.boolean(),
  enableOnlineBooking: z.boolean(),
  reminderLeadHours:   z.coerce.number().int(),
  // Bank account
  bankAccountHolder:   z.string().trim().max(100).optional(),
  bankName:            z.string().trim().max(100).optional(),
  bankAccountNumber:   z.string().trim().max(20).optional(),
  ifscCode:            z.string().trim().max(11).optional(),
  upiId:               z.string().trim().max(50).optional(),
});

type SettingsFormValues = z.infer<typeof schema>;

// ── Section Card ──────────────────────────────────────────────────────────────

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    {children}
  </div>
);

// ── Map clinic doc → form defaults ────────────────────────────────────────────

const toFormValues = (c: ClinicDoc): SettingsFormValues => ({
  name:                c.name,
  type:                c.type,
  registrationNumber:    c.registrationNumber ?? '',
  gstin:                 c.gstin ?? '',
  pharmacyGstin:         c.pharmacyGstin ?? '',
  logoUrl:             c.logoUrl ?? '',
  mobile:              c.mobile,
  alternateMobile:     c.alternateMobile ?? '',
  email:               c.email,
  website:             c.website ?? '',
  addressLine1:        c.address.line1,
  addressLine2:        c.address.line2 ?? '',
  city:                c.address.city,
  state:               c.address.state,
  pincode:             c.address.pincode,
  appointmentDuration: c.settings.appointmentDuration,
  workingDays:         c.settings.workingDays,
  workingHoursStart:   c.settings.workingHours.start,
  workingHoursEnd:     c.settings.workingHours.end,
  tokenPrefix:           c.settings.tokenPrefix,
  invoicePrefix:         c.settings.invoicePrefix,
  pharmacyInvoicePrefix: c.settings.pharmacyInvoicePrefix ?? 'PH',
  patientIdPrefix:       c.settings.patientIdPrefix,
  printHeader:         c.settings.printHeader ?? '',
  printFooter:         c.settings.printFooter ?? '',
  enableSMS:           c.settings.enableSMS ?? false,
  enableWhatsApp:      c.settings.enableWhatsApp ?? false,
  enableOnlineBooking: c.settings.enableOnlineBooking ?? false,
  reminderLeadHours:   (c.settings as any).reminderLeadHours ?? 24,
  bankAccountHolder:   c.bankAccount?.accountHolderName ?? '',
  bankName:            c.bankAccount?.bankName ?? '',
  bankAccountNumber:   c.bankAccount?.accountNumber ?? '',
  ifscCode:            c.bankAccount?.ifscCode ?? '',
  upiId:               c.bankAccount?.upiId ?? '',
});

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const dispatch    = useAppDispatch();
  const user        = useAppSelector((s) => s.auth.user);
  const clinicState = useAppSelector((s) => s.clinic.clinic);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoErr, setLogoErr]             = useState('');

  const [loading, setLoading]     = useState(!clinicState);
  const [error, setError]         = useState('');
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved]         = useState(false);
  const [submitting, setSub]      = useState(false);

  const {
    register, control, handleSubmit, reset,
    watch, setValue,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: clinicState ? toFormValues(clinicState) : undefined,
  });

  // Load clinic if not already in Redux
  useEffect(() => {
    if (clinicState) {
      reset(toFormValues(clinicState));
      setLoading(false);
      return;
    }
    clinicApi.get()
      .then((res) => {
        dispatch(setClinic(res.data.data));
        reset(toFormValues(res.data.data));
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (logoInputRef.current) logoInputRef.current.value = '';
    if (!file) return;
    setLogoErr('');
    setLogoUploading(true);
    try {
      const res = await clinicApi.uploadLogo(file);
      dispatch(setClinic(res.data.data.clinic));
      setValue('logoUrl', res.data.data.logoUrl, { shouldDirty: false });
    } catch (e: any) {
      setLogoErr(e?.response?.data?.message ?? 'Logo upload failed');
    } finally {
      setLogoUploading(false);
    }
  };

  const workingDays = watch('workingDays');

  const toggleDay = (day: number) => {
    const current = workingDays ?? [];
    setValue(
      'workingDays',
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
      { shouldDirty: true }
    );
  };

  const onSubmit = async (values: SettingsFormValues) => {
    setSub(true);
    setSaveError('');
    setSaved(false);
    try {
      const res = await clinicApi.update({
        name:               values.name,
        type:               values.type,
        registrationNumber: values.registrationNumber || undefined,
        gstin:              values.gstin              || undefined,
        pharmacyGstin:      values.pharmacyGstin      || undefined,
        logoUrl:            values.logoUrl  || undefined,
        mobile:             values.mobile,
        alternateMobile:    values.alternateMobile || undefined,
        email:              values.email,
        website:            values.website  || undefined,
        address: {
          line1:   values.addressLine1,
          line2:   values.addressLine2 || undefined,
          city:    values.city,
          state:   values.state,
          pincode: values.pincode,
        },
        settings: {
          appointmentDuration: values.appointmentDuration,
          workingDays:         values.workingDays,
          workingHours:        { start: values.workingHoursStart, end: values.workingHoursEnd },
          tokenPrefix:            values.tokenPrefix,
          invoicePrefix:          values.invoicePrefix,
          pharmacyInvoicePrefix:  values.pharmacyInvoicePrefix,
          patientIdPrefix:        values.patientIdPrefix,
          printHeader:         values.printHeader || undefined,
          printFooter:         values.printFooter || undefined,
          enableSMS:           values.enableSMS,
          enableWhatsApp:      values.enableWhatsApp,
          enableOnlineBooking: values.enableOnlineBooking,
          reminderLeadHours:   values.reminderLeadHours,
        },
        bankAccount: {
          accountHolderName: values.bankAccountHolder || undefined,
          bankName:          values.bankName          || undefined,
          accountNumber:     values.bankAccountNumber || undefined,
          ifscCode:          values.ifscCode          || undefined,
          upiId:             values.upiId             || undefined,
        },
      });
      dispatch(setClinic(res.data.data));
      // Update clinicName in auth state so header reflects any name change
      dispatch(updateUser({ clinicName: res.data.data.name }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveError(getErrorMessage(e));
    } finally {
      setSub(false);
    }
  };

  const isAdmin = user?.role === 'ClinicAdmin';

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error)   return <Alert variant="error">{error}</Alert>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Clinic Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAdmin ? 'Manage clinic profile, print settings, and operational preferences.' : 'View clinic information.'}
          </p>
        </div>
        {isAdmin && (
          <Button type="submit" isLoading={submitting} disabled={!isDirty && !submitting}>
            <Save className="h-4 w-4 mr-1.5" />
            Save Changes
          </Button>
        )}
      </div>

      {saveError && <Alert variant="error">{saveError}</Alert>}
      {saved      && <Alert variant="success">Settings saved successfully.</Alert>}

      {/* Clinic Identity */}
      <SectionCard title="Clinic Identity">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Clinic Name <span className="text-destructive">*</span></Label>
            <Input
              {...register('name')}
              className="mt-1"
              disabled={!isAdmin}
              error={errors.name?.message}
            />
          </div>
          <div>
            <Label>Clinic Type</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select
                  options={CLINIC_TYPES.map((t) => ({ value: t, label: t }))}
                  value={field.value}
                  onChange={field.onChange}
                  className="mt-1"
                  disabled={!isAdmin}
                />
              )}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Registration Number</Label>
            <Input
              {...register('registrationNumber')}
              placeholder="e.g., MCI-12345"
              className="mt-1"
              disabled={!isAdmin}
            />
          </div>
          <div>
            <Label>GSTIN</Label>
            <Input
              {...register('gstin')}
              placeholder="e.g., 27AAPFU0939F1ZV"
              className="mt-1"
              disabled={!isAdmin}
              error={errors.gstin?.message}
            />
          </div>
        </div>
        <div>
          <Label>Clinic Logo</Label>
          <div className="mt-1 flex items-center gap-3 flex-wrap">
            {watch('logoUrl') && (
              <img
                src={watch('logoUrl')}
                alt="Clinic logo"
                className="h-12 object-contain rounded border border-border bg-gray-50 p-1"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            {isAdmin && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  isLoading={logoUploading}
                  onClick={() => logoInputRef.current?.click()}
                >
                  {!logoUploading && <Upload className="h-3.5 w-3.5 mr-1" />}
                  {watch('logoUrl') ? 'Replace Logo' : 'Upload Logo'}
                </Button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <span className="text-xs text-muted-foreground">JPEG, PNG, WebP or SVG · max 2 MB</span>
              </>
            )}
          </div>
          {logoErr && <p className="text-xs text-destructive mt-1">{logoErr}</p>}
        </div>
      </SectionCard>

      {/* Contact */}
      <SectionCard title="Contact Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Mobile <span className="text-destructive">*</span></Label>
            <Input
              {...register('mobile')}
              placeholder="10-digit mobile"
              className="mt-1"
              disabled={!isAdmin}
              error={errors.mobile?.message}
            />
          </div>
          <div>
            <Label>Alternate Mobile</Label>
            <Input
              {...register('alternateMobile')}
              placeholder="Optional"
              className="mt-1"
              disabled={!isAdmin}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Email <span className="text-destructive">*</span></Label>
            <Input
              {...register('email')}
              type="email"
              className="mt-1"
              disabled={!isAdmin}
              error={errors.email?.message}
            />
          </div>
          <div>
            <Label>Website</Label>
            <Input
              {...register('website')}
              placeholder="https://..."
              className="mt-1"
              disabled={!isAdmin}
            />
          </div>
        </div>
      </SectionCard>

      {/* Address */}
      <SectionCard title="Address">
        <div>
          <Label>Address Line 1 <span className="text-destructive">*</span></Label>
          <Input
            {...register('addressLine1')}
            placeholder="Street / Building"
            className="mt-1"
            disabled={!isAdmin}
            error={errors.addressLine1?.message}
          />
        </div>
        <div>
          <Label>Address Line 2</Label>
          <Input
            {...register('addressLine2')}
            placeholder="Area / Landmark (optional)"
            className="mt-1"
            disabled={!isAdmin}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>City <span className="text-destructive">*</span></Label>
            <Input
              {...register('city')}
              className="mt-1"
              disabled={!isAdmin}
              error={errors.city?.message}
            />
          </div>
          <div>
            <Label>State <span className="text-destructive">*</span></Label>
            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <Select
                  options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
                  value={field.value}
                  onChange={field.onChange}
                  className="mt-1"
                  disabled={!isAdmin}
                />
              )}
            />
          </div>
          <div>
            <Label>Pincode <span className="text-destructive">*</span></Label>
            <Input
              {...register('pincode')}
              placeholder="6 digits"
              className="mt-1"
              disabled={!isAdmin}
              error={errors.pincode?.message}
            />
          </div>
        </div>
      </SectionCard>

      {/* Print Settings */}
      <SectionCard title="Print Settings">
        <p className="text-xs text-muted-foreground">
          Text shown on prescriptions, invoices, and lab reports.
        </p>
        <div>
          <Label>Print Header</Label>
          <Input
            {...register('printHeader')}
            placeholder="e.g., Dr. Sharma's Multi-Specialty Clinic — Est. 2005"
            className="mt-1"
            disabled={!isAdmin}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Tagline shown above the clinic name on all print-outs.
          </p>
        </div>
        <div>
          <Label>Print Footer</Label>
          <textarea
            {...register('printFooter')}
            rows={2}
            disabled={!isAdmin}
            placeholder="e.g., This prescription is valid for 30 days. For emergencies call: 98765-43210"
            className="mt-1 flex min-h-[56px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none disabled:opacity-60"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Disclaimer or note shown at the bottom of every print-out.
          </p>
        </div>
      </SectionCard>

      {/* Numbering Prefixes */}
      <SectionCard title="Numbering Prefixes">
        <p className="text-xs text-muted-foreground">
          Prefixes are applied when new records are created. Changing them only affects future records.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Token Prefix</Label>
            <Input
              {...register('tokenPrefix')}
              placeholder="T"
              className="mt-1"
              disabled={!isAdmin}
            />
            <p className="text-xs text-muted-foreground mt-1">e.g., T → T001</p>
          </div>
          <div>
            <Label>Invoice Prefix</Label>
            <Input
              {...register('invoicePrefix')}
              placeholder="INV"
              className="mt-1"
              disabled={!isAdmin}
            />
            <p className="text-xs text-muted-foreground mt-1">e.g., INV → INV-2024-0001</p>
          </div>
          <div>
            <Label>Patient ID Prefix</Label>
            <Input
              {...register('patientIdPrefix')}
              placeholder="CX"
              className="mt-1"
              disabled={!isAdmin}
            />
            <p className="text-xs text-muted-foreground mt-1">e.g., CX → CX-0001</p>
          </div>
        </div>
      </SectionCard>

      {/* Pharmacy Settings */}
      <SectionCard title="Pharmacy Settings">
        <p className="text-xs text-muted-foreground">
          Configure pharmacy billing when the pharmacy operates separately from the main clinic.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Pharmacy GSTIN</Label>
            <Input
              {...register('pharmacyGstin')}
              placeholder="e.g., 27AAPFU0939F1ZV"
              className="mt-1"
              disabled={!isAdmin}
            />
            <p className="text-xs text-muted-foreground mt-1">Appears on pharmacy invoices. Leave blank to use clinic GSTIN.</p>
          </div>
          <div>
            <Label>Pharmacy Invoice Prefix</Label>
            <Input
              {...register('pharmacyInvoicePrefix')}
              placeholder="PH"
              className="mt-1"
              disabled={!isAdmin}
            />
            <p className="text-xs text-muted-foreground mt-1">e.g., PH → PH-2024-0001</p>
          </div>
        </div>
      </SectionCard>

      {/* Appointment Settings */}
      <SectionCard title="Appointment Settings">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Slot Duration (minutes)</Label>
            <Input
              {...register('appointmentDuration')}
              type="number"
              min={5}
              max={120}
              step={5}
              className="mt-1"
              disabled={!isAdmin}
            />
          </div>
          <div>
            <Label>Working Hours Start</Label>
            <Input
              {...register('workingHoursStart')}
              type="time"
              className="mt-1"
              disabled={!isAdmin}
            />
          </div>
          <div>
            <Label>Working Hours End</Label>
            <Input
              {...register('workingHoursEnd')}
              type="time"
              className="mt-1"
              disabled={!isAdmin}
            />
          </div>
        </div>
        <div>
          <Label>Working Days</Label>
          <div className="flex gap-2 mt-2 flex-wrap">
            {DAYS.map((label, idx) => {
              const active = (workingDays ?? []).includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => toggleDay(idx)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>

      {/* Feature Toggles */}
      <SectionCard title="Features & Notifications">
        <p className="text-xs text-muted-foreground">Enable or disable optional features for this clinic.</p>
        <div className="space-y-3">
          {(
            [
              { field: 'enableSMS'           as const, label: 'SMS Notifications',     desc: 'Send appointment reminders and alerts via SMS' },
              { field: 'enableWhatsApp'       as const, label: 'WhatsApp Notifications', desc: 'Send reminders and reports via WhatsApp' },
              { field: 'enableOnlineBooking'  as const, label: 'Online Booking',         desc: 'Allow patients to book appointments online' },
            ] as const
          ).map(({ field, label, desc }) => (
            <label key={field} className={`flex items-center justify-between rounded-lg border border-border px-4 py-3 cursor-pointer transition-colors ${!isAdmin ? 'opacity-60 cursor-not-allowed' : 'hover:bg-accent/30'}`}>
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Controller
                name={field}
                control={control}
                render={({ field: f }) => (
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => f.onChange(!f.value)}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-none ${f.value ? 'bg-primary' : 'bg-gray-200'} disabled:cursor-not-allowed`}
                  >
                    <span className={`inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow transition-transform ${f.value ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                )}
              />
            </label>
          ))}
        </div>

        {/* Booking URL — shown when online booking is enabled */}
        {watch('enableOnlineBooking') && clinicState?.slug && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 space-y-1">
            <p className="text-xs font-medium text-primary">Patient Booking Link</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-foreground break-all font-mono bg-background border border-border rounded px-2 py-1.5">
                {`${window.location.origin}/book/${clinicState.slug}`}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/book/${clinicState.slug}`)}
                className="shrink-0 text-xs text-primary border border-primary/40 rounded px-2 py-1.5 hover:bg-primary/10 transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Share this link with patients so they can book appointments without calling.</p>
          </div>
        )}

        {/* Reminder lead time — only relevant when SMS or WhatsApp is on */}
        <div className="pt-1">
          <Label>Appointment Reminder — Send How Early?</Label>
          <div className="mt-1 max-w-xs">
            <Controller
              name="reminderLeadHours"
              control={control}
              render={({ field: f }) => (
                <Select
                  value={String(f.value)}
                  onChange={(v) => f.onChange(Number(v))}
                  disabled={!isAdmin}
                  options={[
                    { value: '2',  label: '2 hours before' },
                    { value: '4',  label: '4 hours before' },
                    { value: '6',  label: '6 hours before' },
                    { value: '12', label: '12 hours before' },
                    { value: '24', label: '24 hours before (default)' },
                    { value: '48', label: '48 hours before' },
                  ]}
                />
              )}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            How far in advance the system sends appointment reminders to patients (requires SMS or WhatsApp enabled).
          </p>
        </div>
      </SectionCard>

      {/* Bank Account */}
      <SectionCard title="Bank & Payment Details">
        <p className="text-xs text-muted-foreground">
          Shown in the "Pay To" section on invoices. Leave blank to hide.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Account Holder Name</Label>
            <Input {...register('bankAccountHolder')} placeholder="Dr. Sharma's Clinic" className="mt-1" disabled={!isAdmin} />
          </div>
          <div>
            <Label>Bank Name</Label>
            <Input {...register('bankName')} placeholder="e.g. State Bank of India" className="mt-1" disabled={!isAdmin} />
          </div>
          <div>
            <Label>Account Number</Label>
            <Input {...register('bankAccountNumber')} placeholder="12-digit account number" className="mt-1" disabled={!isAdmin} />
          </div>
          <div>
            <Label>IFSC Code</Label>
            <Input {...register('ifscCode')} placeholder="e.g. SBIN0001234" className="mt-1" disabled={!isAdmin} />
          </div>
          <div>
            <Label>UPI ID</Label>
            <Input {...register('upiId')} placeholder="clinic@upi" className="mt-1" disabled={!isAdmin} />
          </div>
        </div>
      </SectionCard>

      {/* Save button — bottom repeat for long forms */}
      {isAdmin && (
        <div className="flex justify-end pb-4">
          <Button type="submit" isLoading={submitting} disabled={!isDirty && !submitting}>
            <Save className="h-4 w-4 mr-1.5" />
            Save Changes
          </Button>
        </div>
      )}
    </form>
  );
}
