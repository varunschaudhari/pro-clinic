import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Stethoscope, Activity, FileText,
  CheckCircle2, User, Phone, Calendar, Clock, AlertCircle,
} from 'lucide-react';

import { appointmentApi, type AppointmentItem } from '@/services/appointment.service';
import { vitalsApi, type VitalSignsDoc } from '@/services/vitals.service';
import { prescriptionApi, type PrescriptionItem } from '@/services/prescription.service';
import { useAppSelector } from '@/app/hooks';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { VitalsModal } from '@/features/appointments/components/VitalsModal';
import { VitalsDisplay } from '@/features/appointments/components/VitalsDisplay';
import { PrescriptionForm } from '@/features/prescriptions/components/PrescriptionForm';
import type { PrescriptionFormValues } from '@/features/prescriptions/components/PrescriptionForm';
import { calculateAge, getErrorMessage } from '@/lib/utils';
import type { CreatePrescriptionPayload, UpdatePrescriptionPayload } from '@/services/prescription.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function rxToFormValues(rx: PrescriptionItem): Partial<PrescriptionFormValues> {
  const medicines = rx.medicines.map((m) => {
    const parts = m.duration.split(' ');
    const dv    = parts[0] ?? '5';
    const unit  = parts[1] as 'days' | 'weeks' | 'months';
    return {
      name:          m.name,
      genericName:   m.genericName ?? '',
      dosage:        m.dosage,
      frequency:     m.frequency,
      durationValue: dv,
      durationUnit:  (['days', 'weeks', 'months'] as const).includes(unit) ? unit : 'days' as const,
      unit:          m.unit,
      route:         m.route ?? 'oral',
      instructions:  m.instructions ?? '',
      quantity:      m.quantity != null ? String(m.quantity) : '',
    };
  });

  const labTests = rx.labTests.map(t => ({
    name:    t.name,
    urgency: (t.urgency ?? 'routine') as 'routine' | 'urgent' | 'stat',
    notes:   t.notes ?? '',
  }));

  return {
    diagnosis:            rx.diagnosis,
    icdCodes:             rx.icdCodes ?? [],
    medicines:            medicines.length > 0 ? medicines : undefined,
    labTests,
    procedures:           rx.procedures ?? [],
    advice:               rx.advice ?? '',
    dietAdvice:           rx.dietAdvice ?? '',
    followUpDate:         rx.followUpDate ? rx.followUpDate.slice(0, 10) : '',
    followUpInstructions: rx.followUpInstructions ?? '',
    doctorNotes:          rx.doctorNotes ?? '',
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const MODE_LABEL: Record<string, string> = {
  walkin: 'Walk-in', scheduled: 'Scheduled', teleconsult: 'Teleconsult',
};

const STATUS_CFG = {
  scheduled:   { label: 'Waiting',           badge: 'bg-gray-100 text-gray-700' },
  confirmed:   { label: 'Confirmed',         badge: 'bg-blue-50 text-blue-700' },
  in_progress: { label: 'In Consultation',   badge: 'bg-amber-50 text-amber-700' },
  completed:   { label: 'Completed',         badge: 'bg-green-50 text-green-700' },
  cancelled:   { label: 'Cancelled',         badge: 'bg-red-50 text-red-700' },
  no_show:     { label: 'No Show',           badge: 'bg-orange-50 text-orange-700' },
} as const;

// ── Past visit card ───────────────────────────────────────────────────────────

function PastVisitCard({ rx }: { rx: PrescriptionItem }) {
  const medicines = rx.medicines.slice(0, 4).map(m => m.name).join(', ');
  const extra = rx.medicines.length > 4 ? ` +${rx.medicines.length - 4} more` : '';
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-foreground">
          {fmtDate(rx.createdAt)}
        </span>
        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
          {rx.prescriptionNumber}
        </span>
      </div>
      {rx.diagnosis.length > 0 && (
        <p className="text-xs text-foreground font-medium leading-snug">
          {rx.diagnosis.join(' · ')}
        </p>
      )}
      {medicines && (
        <p className="text-[11px] text-muted-foreground leading-snug">
          {medicines}{extra}
        </p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'vitals' | 'prescription';

export default function ConsultationPage() {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate          = useNavigate();
  const user              = useAppSelector(s => s.auth.user);

  // ── Data state ───────────────────────────────────────────────────────────
  const [appt, setAppt]               = useState<AppointmentItem | null>(null);
  const [vitals, setVitals]           = useState<VitalSignsDoc | null>(null);
  const [prescription, setPrescription] = useState<PrescriptionItem | null>(null);
  const [pastRx, setPastRx]           = useState<PrescriptionItem[]>([]);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [activeTab, setActiveTab]     = useState<Tab>('vitals');
  const [vitalsOpen, setVitalsOpen]   = useState(false);
  const [rxSubmitting, setRxSubmitting] = useState(false);
  const [rxError, setRxError]         = useState('');
  const [rxSaved, setRxSaved]         = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  // ── Load data ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!appointmentId) return;
    try {
      setLoading(true);
      setError('');
      const [apptRes, vitalsRes] = await Promise.all([
        appointmentApi.get(appointmentId),
        vitalsApi.getByAppointment(appointmentId),
      ]);
      const a = apptRes.data.data;
      setAppt(a);
      setVitals(vitalsRes.data.data ?? null);

      // Load prescription + past visits in parallel
      const [rxRes, pastRes] = await Promise.all([
        a.prescriptionId
          ? prescriptionApi.get(a.prescriptionId).then(r => r.data.data)
          : null,
        prescriptionApi.list({ patientId: a.patient._id, limit: 6 }).then(r => r.data.data),
      ]);

      if (rxRes) setPrescription(rxRes);
      setPastRx((pastRes ?? []).filter(r => r.appointmentId !== appointmentId).slice(0, 5));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => { load(); }, [load]);

  // ── Status transitions ────────────────────────────────────────────────────
  const handleStartConsultation = async () => {
    if (!appt) return;
    setStatusLoading(true);
    try {
      const res = await appointmentApi.updateStatus(appt._id, { status: 'in_progress' });
      setAppt(res.data.data);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleEndConsultation = async () => {
    if (!appt) return;
    setStatusLoading(true);
    try {
      await appointmentApi.updateStatus(appt._id, { status: 'completed' });
      navigate('/appointments');
    } finally {
      setStatusLoading(false);
    }
  };

  // ── Prescription save ─────────────────────────────────────────────────────
  const handleRxSubmit = async (payload: CreatePrescriptionPayload | UpdatePrescriptionPayload) => {
    if (!appt) return;
    setRxSubmitting(true);
    setRxError('');
    setRxSaved(false);
    try {
      let saved: PrescriptionItem;
      if (prescription) {
        const res = await prescriptionApi.update(prescription._id, payload as UpdatePrescriptionPayload);
        saved = res.data.data;
      } else {
        const res = await prescriptionApi.create({ ...payload as CreatePrescriptionPayload, appointmentId: appt._id });
        saved = res.data.data;
      }
      setPrescription(saved);
      setRxSaved(true);
      setTimeout(() => setRxSaved(false), 3000);
    } catch (e) {
      setRxError(getErrorMessage(e));
    } finally {
      setRxSubmitting(false);
    }
  };

  // ── Loading / error states ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !appt) {
    return (
      <div className="max-w-lg mx-auto mt-12 px-4">
        <Alert variant="error">{error || 'Appointment not found'}</Alert>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/appointments')}
          leftIcon={<ChevronLeft className="h-4 w-4" />}>
          Back to Appointments
        </Button>
      </div>
    );
  }

  const p          = appt.patient;
  const statusCfg  = STATUS_CFG[appt.status] ?? STATUS_CFG.scheduled;
  const isActive   = appt.status === 'in_progress';
  const canStart   = ['scheduled', 'confirmed'].includes(appt.status);
  const isTerminal = ['completed', 'cancelled', 'no_show'].includes(appt.status);

  const age = p.dob
    ? `${calculateAge(p.dob)} yrs`
    : p.age != null
    ? `${p.age}${p.ageUnit === 'years' ? ' yrs' : ' ' + (p.ageUnit ?? 'yrs')}`
    : null;

  const rxDefaults = prescription ? rxToFormValues(prescription) : undefined;

  return (
    <div className="flex flex-col min-h-screen bg-background">

      {/* ── Top header bar ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white border-b border-border shadow-sm">
        <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-4">
          {/* Back */}
          <button
            onClick={() => navigate('/appointments')}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Appointments</span>
          </button>

          <div className="h-5 w-px bg-border shrink-0" />

          {/* Token + meta */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
              {appt.tokenDisplay}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate leading-none">{p.name}</p>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                <span>{MODE_LABEL[appt.mode]}</span>
                <span>·</span>
                <span className="capitalize">{appt.visitType === 'new' ? 'New Visit' : 'Follow-up'}</span>
                <span>·</span>
                <span>{appt.slotStart}</span>
                {appt.chiefComplaint && (
                  <>
                    <span>·</span>
                    <span className="truncate max-w-[160px]">{appt.chiefComplaint}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status + action */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusCfg.badge}`}>
              {statusCfg.label}
            </span>

            {canStart && !isTerminal && (
              <Button
                size="sm"
                isLoading={statusLoading}
                onClick={handleStartConsultation}
                leftIcon={<Stethoscope className="h-3.5 w-3.5" />}
              >
                Start Consultation
              </Button>
            )}

            {isActive && (
              <Button
                size="sm"
                isLoading={statusLoading}
                onClick={handleEndConsultation}
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              >
                End Consultation
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-screen-xl mx-auto w-full px-4 py-4 flex gap-4 items-start">

        {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
        <aside className="w-72 shrink-0 space-y-3 sticky top-[72px]">

          {/* Patient card */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{p.patientId}</p>
              </div>
            </div>

            <div className="space-y-1.5 text-xs">
              {age && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                  <span className="capitalize">{p.gender} · {age}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span>{p.mobile}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                <span>{appt.slotStart} · {fmtDate(appt.appointmentDate)}</span>
              </div>
            </div>
          </div>

          {/* Chief complaint */}
          {appt.chiefComplaint && (
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                Chief Complaint
              </p>
              <p className="text-sm text-foreground leading-snug">{appt.chiefComplaint}</p>
            </div>
          )}

          {/* Past visits */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Past Visits
            </p>
            {pastRx.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">First visit</p>
            ) : (
              <div className="space-y-2">
                {pastRx.map(rx => <PastVisitCard key={rx._id} rx={rx} />)}
              </div>
            )}
          </div>
        </aside>

        {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0">

          {/* Tab bar */}
          <div className="flex items-center gap-1 mb-4 border-b border-border">
            <TabBtn
              icon={<Activity className="h-4 w-4" />}
              label="Vitals"
              badge={vitals ? '✓' : undefined}
              badgeColor={vitals ? 'text-green-600' : undefined}
              active={activeTab === 'vitals'}
              onClick={() => setActiveTab('vitals')}
            />
            <TabBtn
              icon={<FileText className="h-4 w-4" />}
              label="Prescription"
              badge={prescription ? '✓' : undefined}
              badgeColor={prescription ? 'text-green-600' : undefined}
              active={activeTab === 'prescription'}
              onClick={() => setActiveTab('prescription')}
            />
          </div>

          {/* ── VITALS TAB ────────────────────────────────────────────────── */}
          {activeTab === 'vitals' && (
            <div className="rounded-xl border border-border bg-card p-5">
              {vitals ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Vitals Recorded</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        By {vitals.recordedBy?.name ?? 'Staff'} ·{' '}
                        {new Date(vitals.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!isTerminal && (
                      <Button size="sm" variant="outline" onClick={() => setVitalsOpen(true)}>
                        Edit Vitals
                      </Button>
                    )}
                  </div>
                  <VitalsDisplay vitals={vitals} compact={false} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                    <Activity className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">No vitals recorded yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Record BP, pulse, temperature, and other vitals before consultation.
                    </p>
                  </div>
                  {!isTerminal && (
                    <Button onClick={() => setVitalsOpen(true)} leftIcon={<Activity className="h-4 w-4" />}>
                      Record Vitals
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── PRESCRIPTION TAB ──────────────────────────────────────────── */}
          {activeTab === 'prescription' && (
            <div className="rounded-xl border border-border bg-card p-5">
              {rxSaved && (
                <Alert variant="success" className="mb-4">
                  Prescription saved successfully.
                </Alert>
              )}
              {rxError && (
                <Alert variant="error" className="mb-4">{rxError}</Alert>
              )}

              {isTerminal && !prescription ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No prescription was created for this consultation.</p>
                </div>
              ) : (
                <PrescriptionForm
                  key={prescription?._id ?? 'new'}
                  appointmentId={appt._id}
                  defaultValues={rxDefaults}
                  isEdit={!!prescription}
                  isSubmitting={rxSubmitting}
                  onSubmit={handleRxSubmit}
                  userRole={user?.role}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Vitals modal ─────────────────────────────────────────────────── */}
      {vitalsOpen && (
        <VitalsModal
          open={vitalsOpen}
          onClose={() => setVitalsOpen(false)}
          appointmentId={appt._id}
          patientId={p._id}
          onSuccess={(v) => { setVitals(v); setVitalsOpen(false); }}
        />
      )}
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────

function TabBtn({
  icon, label, badge, badgeColor, active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  badgeColor?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}
    >
      {icon}
      {label}
      {badge && (
        <span className={`text-xs font-bold ${badgeColor ?? 'text-muted-foreground'}`}>{badge}</span>
      )}
    </button>
  );
}
