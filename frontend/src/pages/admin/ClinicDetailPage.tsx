import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Users, Calendar, Mail, Phone,
  MapPin, CreditCard, Power, Pencil, Check, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { Dialog } from '@/components/ui/Dialog';
import { superadminApi } from '@/services/superadmin.service';
import type { ClinicDetailResponse, ClinicSubscription } from '@/services/superadmin.service';
import { getErrorMessage } from '@/lib/utils';

// ── Helpers ────────────────────────────────────────────────────────────────────

const PLAN_BADGE: Record<string, string> = {
  trial:        'bg-violet-100 text-violet-700',
  basic:        'bg-blue-100 text-blue-700',
  professional: 'bg-emerald-100 text-emerald-700',
  enterprise:   'bg-amber-100 text-amber-700',
};

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  inactive:  'bg-gray-100 text-gray-600',
  expired:   'bg-red-100 text-red-700',
  suspended: 'bg-orange-100 text-orange-700',
};

const ROLE_BADGE: Record<string, string> = {
  ClinicAdmin:  'bg-primary/10 text-primary',
  Doctor:       'bg-blue-100 text-blue-700',
  Receptionist: 'bg-amber-100 text-amber-700',
  Pharmacist:   'bg-emerald-100 text-emerald-700',
};

function fmtDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toInputDate(d?: string) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

// ── Edit Subscription Dialog ───────────────────────────────────────────────────

interface EditSubProps {
  clinicId:     string;
  subscription: ClinicSubscription;
  onClose:      () => void;
  onSaved:      (sub: ClinicSubscription) => void;
}

const PLANS    = ['trial', 'basic', 'professional', 'enterprise'] as const;
const STATUSES = ['active', 'inactive', 'expired', 'suspended']  as const;

function EditSubDialog({ clinicId, subscription, onClose, onSaved }: EditSubProps) {
  const [plan,        setPlan]        = useState(subscription.plan);
  const [status,      setStatus]      = useState(subscription.status);
  const [endDate,     setEndDate]     = useState(toInputDate(subscription.endDate));
  const [maxDoctors,  setMaxDoctors]  = useState(String(subscription.maxDoctors));
  const [maxPatients, setMaxPatients] = useState(String(subscription.maxPatients));
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const r = await superadminApi.updateSubscription(clinicId, {
        plan,
        status,
        endDate,
        maxDoctors:  parseInt(maxDoctors),
        maxPatients: parseInt(maxPatients),
      });
      onSaved(r.data.data.subscription);
      toast.success('Subscription updated');
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Edit Subscription" size="sm">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label required>Plan</Label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value as typeof plan)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring capitalize"
          >
            {PLANS.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label required>Status</Label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring capitalize"
          >
            {STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label required>Subscription End Date</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label required>Max Doctors</Label>
            <Input type="number" min={1} value={maxDoctors} onChange={(e) => setMaxDoctors(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label required>Max Patients</Label>
            <Input type="number" min={1} value={maxPatients} onChange={(e) => setMaxPatients(e.target.value)} />
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" isLoading={saving} onClick={save}>Save</Button>
        </div>
      </div>
    </Dialog>
  );
}

// ── Stat block ─────────────────────────────────────────────────────────────────

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-3">
      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
      <div>
        <p className="text-lg font-bold text-foreground">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function ClinicDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data,    setData]    = useState<ClinicDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [editSub, setEditSub] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!id) return;
    superadminApi.getClinic(id)
      .then((r) => setData(r.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const handleToggleStatus = async () => {
    if (!data || !id) return;
    setToggling(true);
    try {
      const r = await superadminApi.toggleStatus(id);
      setData((prev) => prev ? {
        ...prev,
        clinic: {
          ...prev.clinic,
          isActive: r.data.data.isActive,
          subscription: { ...prev.clinic.subscription, status: r.data.data.subscriptionStatus as any },
        },
      } : prev);
      toast.success(r.data.data.isActive ? 'Clinic activated' : 'Clinic suspended');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (error)   return <Alert variant="error">{error}</Alert>;
  if (!data)   return null;

  const { clinic, staff, usage } = data;
  const effectiveStatus = !clinic.isActive ? 'inactive' : clinic.subscription.status;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/clinics')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Back to Clinics
        </Button>
      </div>

      {/* Title bar */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{clinic.name}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{clinic.type} · {clinic.address.city}, {clinic.address.state}</p>
        </div>
        <Button
          size="sm"
          variant={clinic.isActive ? 'destructive' : 'primary'}
          leftIcon={<Power className="h-4 w-4" />}
          isLoading={toggling}
          onClick={handleToggleStatus}
        >
          {clinic.isActive ? 'Suspend' : 'Activate'}
        </Button>
      </div>

      {/* Usage stats */}
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Total Patients"       value={usage.totalPatients}          icon={Users} />
        <Stat label="Total Appointments"   value={usage.totalAppointments}      icon={Calendar} />
        <Stat label="Appts (last 30 days)" value={usage.appointmentsLast30Days} icon={Calendar} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Clinic info card */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Clinic Info</h2>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-start gap-2 text-muted-foreground">
              <Phone className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{clinic.mobile}</span>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{clinic.email}</span>
            </div>
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{clinic.address.line1}, {clinic.address.city}, {clinic.address.state} – {clinic.address.pincode}</span>
            </div>
          </div>
          {(clinic.registrationNumber || clinic.gstin) && (
            <div className="pt-2 border-t border-border space-y-1.5 text-xs text-muted-foreground">
              {clinic.registrationNumber && <p>Reg No: <span className="text-foreground font-medium">{clinic.registrationNumber}</span></p>}
              {clinic.gstin            && <p>GSTIN: <span className="text-foreground font-medium font-mono">{clinic.gstin}</span></p>}
            </div>
          )}
          <p className="text-xs text-muted-foreground pt-1">Registered: {fmtDate(clinic.createdAt)}</p>
        </div>

        {/* Subscription card */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Subscription</h2>
            </div>
            <button
              onClick={() => setEditSub(true)}
              className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title="Edit subscription"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${PLAN_BADGE[clinic.subscription.plan] ?? 'bg-gray-100 text-gray-600'}`}>
              {clinic.subscription.plan}
            </span>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${STATUS_BADGE[effectiveStatus] ?? 'bg-gray-100 text-gray-600'}`}>
              {effectiveStatus}
            </span>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Start</span>
              <span className="font-medium">{fmtDate(clinic.subscription.startDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">End</span>
              <span className="font-medium">{fmtDate(clinic.subscription.endDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Doctors</span>
              <span className="font-medium">{clinic.subscription.maxDoctors}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max Patients</span>
              <span className="font-medium">{clinic.subscription.maxPatients.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Staff table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Staff ({staff.length})</h2>
        </div>
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-gray-50/80">
            <tr>
              {['Name', 'Role', 'Mobile', 'Email', 'Active', 'Joined'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {staff.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">No staff members</td></tr>
            ) : staff.map((s) => (
              <tr key={s._id} className="hover:bg-accent/20 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${ROLE_BADGE[s.role] ?? 'bg-gray-100 text-gray-600'}`}>
                    {s.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{s.mobile}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{s.email}</td>
                <td className="px-4 py-3">
                  {s.isActive
                    ? <Check className="h-4 w-4 text-emerald-600" />
                    : <X className="h-4 w-4 text-red-400" />}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{fmtDate(s.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editSub && (
        <EditSubDialog
          clinicId={clinic._id}
          subscription={clinic.subscription}
          onClose={() => setEditSub(false)}
          onSaved={(sub) => setData((prev) => prev ? { ...prev, clinic: { ...prev.clinic, subscription: sub } } : prev)}
        />
      )}
    </div>
  );
}
