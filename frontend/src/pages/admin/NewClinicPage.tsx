import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, CreditCard, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { CLINIC_TYPES, INDIAN_STATES } from '@/constants/india';
import { superadminApi } from '@/services/superadmin.service';
import { getErrorMessage } from '@/lib/utils';

// ── Section wrapper ────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2 pb-1 border-b border-border">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label required={required}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Default end date (30 days from today) ─────────────────────────────────────

function defaultEndDate() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

// ── Form state type ────────────────────────────────────────────────────────────

interface FormState {
  // Clinic
  name:               string;
  type:               string;
  mobile:             string;
  email:              string;
  website:            string;
  line1:              string;
  line2:              string;
  city:               string;
  state:              string;
  pincode:            string;
  registrationNumber: string;
  gstin:              string;
  // Subscription
  plan:               string;
  endDate:            string;
  maxDoctors:         string;
  maxPatients:        string;
  // Admin
  adminName:          string;
  adminMobile:        string;
  adminEmail:         string;
  adminPassword:      string;
}

const INITIAL: FormState = {
  name: '', type: CLINIC_TYPES[0], mobile: '', email: '', website: '',
  line1: '', line2: '', city: '', state: INDIAN_STATES[13], pincode: '',
  registrationNumber: '', gstin: '',
  plan: 'trial', endDate: defaultEndDate(), maxDoctors: '1', maxPatients: '500',
  adminName: '', adminMobile: '', adminEmail: '', adminPassword: '',
};

const PLANS = [
  { value: 'trial',        label: 'Trial (30 days free)' },
  { value: 'basic',        label: 'Basic' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise',   label: 'Enterprise' },
];

// ── Main page ──────────────────────────────────────────────────────────────────

export default function NewClinicPage() {
  const navigate = useNavigate();
  const [form, setForm]       = useState<FormState>(INITIAL);
  const [errors, setErrors]   = useState<Partial<FormState>>({});
  const [saving, setSaving]   = useState(false);
  const [apiError, setApiError] = useState('');

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = (): boolean => {
    const e: Partial<FormState> = {};
    if (!form.name.trim())                              e.name = 'Required';
    if (!form.mobile || !/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = 'Enter valid 10-digit mobile';
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email))   e.email  = 'Enter valid email';
    if (!form.line1.trim())  e.line1   = 'Required';
    if (!form.city.trim())   e.city    = 'Required';
    if (!form.pincode || !/^\d{6}$/.test(form.pincode)) e.pincode = 'Enter valid 6-digit PIN';
    if (!form.adminName.trim())  e.adminName   = 'Required';
    if (!form.adminMobile || !/^[6-9]\d{9}$/.test(form.adminMobile)) e.adminMobile = 'Enter valid 10-digit mobile';
    if (!form.adminEmail || !/\S+@\S+\.\S+/.test(form.adminEmail))   e.adminEmail  = 'Enter valid email';
    if (!form.adminPassword || form.adminPassword.length < 8) e.adminPassword = 'Minimum 8 characters';
    if (parseInt(form.maxDoctors) < 1)  e.maxDoctors  = 'Must be ≥ 1';
    if (parseInt(form.maxPatients) < 1) e.maxPatients = 'Must be ≥ 1';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setApiError('');
    try {
      const r = await superadminApi.createClinic({
        name:    form.name.trim(),
        type:    form.type,
        mobile:  form.mobile,
        email:   form.email,
        website: form.website || undefined,
        address: {
          line1:   form.line1.trim(),
          line2:   form.line2.trim() || undefined,
          city:    form.city.trim(),
          state:   form.state,
          pincode: form.pincode,
        },
        registrationNumber: form.registrationNumber.trim() || undefined,
        gstin:   form.gstin.trim().toUpperCase() || undefined,
        plan:        form.plan,
        endDate:     form.endDate,
        maxDoctors:  parseInt(form.maxDoctors),
        maxPatients: parseInt(form.maxPatients),
        adminName:     form.adminName.trim(),
        adminMobile:   form.adminMobile,
        adminEmail:    form.adminEmail,
        adminPassword: form.adminPassword,
      });
      toast.success('Clinic created successfully');
      navigate(`/admin/clinics/${r.data.data.clinic._id}`);
    } catch (e) {
      setApiError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/clinics')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Back to Clinics
        </Button>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-foreground">Onboard New Clinic</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Fill in clinic details, subscription plan, and the primary admin account</p>
      </div>

      {apiError && <Alert variant="error" onClose={() => setApiError('')}>{apiError}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Clinic Info */}
        <Section title="Clinic Information" icon={Building2}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Clinic Name" required error={errors.name}>
              <Input value={form.name} onChange={set('name')} placeholder="e.g. Sunrise Health Clinic" error={errors.name} />
            </Field>
            <Field label="Clinic Type" required>
              <select value={form.type} onChange={set('type')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {CLINIC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Mobile" required error={errors.mobile}>
              <Input value={form.mobile} onChange={set('mobile')} placeholder="10-digit mobile" maxLength={10} error={errors.mobile} />
            </Field>
            <Field label="Email" required error={errors.email}>
              <Input type="email" value={form.email} onChange={set('email')} placeholder="clinic@example.com" error={errors.email} />
            </Field>
            <Field label="Website">
              <Input value={form.website} onChange={set('website')} placeholder="https://..." />
            </Field>
          </div>

          {/* Address */}
          <div className="pt-2 border-t border-border/60">
            <p className="text-xs font-medium text-muted-foreground mb-3">Address</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Address Line 1" required error={errors.line1}>
                  <Input value={form.line1} onChange={set('line1')} placeholder="Street / Building" error={errors.line1} />
                </Field>
              </div>
              <Field label="Address Line 2">
                <Input value={form.line2} onChange={set('line2')} placeholder="Area / Locality (optional)" />
              </Field>
              <Field label="City" required error={errors.city}>
                <Input value={form.city} onChange={set('city')} placeholder="City" error={errors.city} />
              </Field>
              <Field label="State" required>
                <select value={form.state} onChange={set('state')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="PIN Code" required error={errors.pincode}>
                <Input value={form.pincode} onChange={set('pincode')} placeholder="6-digit PIN" maxLength={6} error={errors.pincode} />
              </Field>
            </div>
          </div>

          {/* Optional legal */}
          <div className="pt-2 border-t border-border/60">
            <p className="text-xs font-medium text-muted-foreground mb-3">Legal (optional)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Registration Number">
                <Input value={form.registrationNumber} onChange={set('registrationNumber')} placeholder="State Medical Council Reg." />
              </Field>
              <Field label="GSTIN">
                <Input value={form.gstin} onChange={set('gstin')} placeholder="15-char GSTIN" maxLength={15} className="uppercase" />
              </Field>
            </div>
          </div>
        </Section>

        {/* Subscription */}
        <Section title="Subscription Plan" icon={CreditCard}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-2">
              <Field label="Plan" required>
                <select value={form.plan} onChange={set('plan')} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {PLANS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Subscription End Date" required>
                <Input type="date" value={form.endDate} onChange={set('endDate')} min={new Date().toISOString().slice(0, 10)} />
              </Field>
            </div>
            <Field label="Max Doctors" required error={errors.maxDoctors}>
              <Input type="number" min={1} value={form.maxDoctors} onChange={set('maxDoctors')} error={errors.maxDoctors} />
            </Field>
            <Field label="Max Patients" required error={errors.maxPatients}>
              <Input type="number" min={1} value={form.maxPatients} onChange={set('maxPatients')} error={errors.maxPatients} />
            </Field>
          </div>
        </Section>

        {/* Admin user */}
        <Section title="Primary Admin Account" icon={UserCog}>
          <p className="text-xs text-muted-foreground -mt-2">This will be the ClinicAdmin user for this clinic.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Name" required error={errors.adminName}>
              <Input value={form.adminName} onChange={set('adminName')} placeholder="Admin's full name" error={errors.adminName} />
            </Field>
            <Field label="Mobile" required error={errors.adminMobile}>
              <Input value={form.adminMobile} onChange={set('adminMobile')} placeholder="10-digit mobile" maxLength={10} error={errors.adminMobile} />
            </Field>
            <Field label="Email" required error={errors.adminEmail}>
              <Input type="email" value={form.adminEmail} onChange={set('adminEmail')} placeholder="admin@clinic.com" error={errors.adminEmail} />
            </Field>
            <Field label="Password" required error={errors.adminPassword}>
              <Input type="password" value={form.adminPassword} onChange={set('adminPassword')} placeholder="Min. 8 characters" error={errors.adminPassword} />
            </Field>
          </div>
        </Section>

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/clinics')}>Cancel</Button>
          <Button type="submit" isLoading={saving}>Create Clinic</Button>
        </div>
      </form>
    </div>
  );
}
