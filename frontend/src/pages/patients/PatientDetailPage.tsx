import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Activity, AlertCircle, Calendar, CalendarDays, ClipboardList,
  Clock, Droplets, FileText, FlaskConical, HeartPulse,
  Pill, Receipt, Stethoscope, User, Share2, Copy, CheckCheck,
} from 'lucide-react';

import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { PatientHeader } from '@/features/patients/components/PatientHeader';
import { VitalsDisplay } from '@/features/appointments/components/VitalsDisplay';
import { VitalsTrendChart } from '@/features/appointments/components/VitalsTrendChart';
import { patientApi } from '@/services/patient.service';
import type { PatientDetail } from '@/services/patient.service';
import { vitalsApi } from '@/services/vitals.service';
import type { VitalSignsDoc } from '@/services/vitals.service';
import { prescriptionApi } from '@/services/prescription.service';
import type { PrescriptionItem } from '@/services/prescription.service';
import { billingApi } from '@/services/billing.service';
import type { InvoiceDoc } from '@/services/billing.service';
import { PAYMENT_STATUS_CONFIG } from '@/constants/billing';
import { labApi } from '@/services/labReport.service';
import type { LabReportDoc } from '@/services/labReport.service';
import { LAB_STATUS_CONFIG } from '@/constants/labReport';
import { appointmentApi } from '@/services/appointment.service';
import type { AppointmentItem, AppointmentStatus } from '@/services/appointment.service';
import { cn, formatDate, getErrorMessage } from '@/lib/utils';
import { useAppSelector } from '@/app/hooks';
import { portalApi } from '@/services/portal.service';

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',      label: 'Overview',       icon: User },
  { id: 'medical',       label: 'Medical History', icon: Activity },
  { id: 'visits',        label: 'Visits',          icon: Calendar },
  { id: 'prescriptions', label: 'Prescriptions',   icon: Pill },
  { id: 'lab',           label: 'Lab Reports',      icon: FlaskConical },
  { id: 'billing',       label: 'Billing',          icon: Receipt },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ── Detail row helper ─────────────────────────────────────────────────────────

const DetailRow = ({ label, value }: { label: string; value?: string | number | null }) =>
  value != null && value !== '' ? (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground mt-0.5">{value}</span>
    </div>
  ) : null;

// ── Section heading ───────────────────────────────────────────────────────────

const SubSection = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div>
    <div className="flex items-center gap-2 mb-3">
      <span className="text-muted-foreground">{icon}</span>
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
    </div>
    {children}
  </div>
);

// ── Tag list helper ───────────────────────────────────────────────────────────

const TagList = ({ items, emptyText, colorClass }: { items: string[]; emptyText: string; colorClass?: string }) =>
  items.length > 0 ? (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium',
            colorClass ?? 'bg-primary/10 text-primary'
          )}
        >
          {item}
        </span>
      ))}
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">{emptyText}</p>
  );

// ── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ patient }: { patient: PatientDetail }) {
  const address = patient.address;
  const hasAddress = address && Object.values(address).some(Boolean);
  const ec = patient.emergencyContact;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Demographics */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <SubSection icon={<User className="h-4 w-4" />} title="Demographics">
          <div className="grid grid-cols-2 gap-4">
            <DetailRow label="Full Name" value={patient.name} />
            <DetailRow label="Patient ID" value={patient.patientId} />
            <DetailRow label="Gender" value={patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)} />
            <DetailRow
              label="Date of Birth"
              value={patient.dob ? formatDate(patient.dob) : undefined}
            />
            {patient.height && <DetailRow label="Height" value={`${patient.height} cm`} />}
            {patient.weight && <DetailRow label="Weight" value={`${patient.weight} kg`} />}
            {patient.bloodGroup && patient.bloodGroup !== 'Unknown' && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Blood Group</span>
                <span className="text-sm font-bold text-red-600 mt-0.5 flex items-center gap-1">
                  <Droplets className="h-3.5 w-3.5" />
                  {patient.bloodGroup}
                </span>
              </div>
            )}
          </div>
        </SubSection>

        {(patient.abhaId || patient.aadharLast4) && (
          <div className="mt-5 pt-5 border-t border-gray-50">
            <SubSection icon={<FileText className="h-4 w-4" />} title="Identity">
              <div className="grid grid-cols-2 gap-4">
                <DetailRow label="ABHA ID" value={patient.abhaId} />
                <DetailRow label="Aadhar Last 4" value={patient.aadharLast4 ? `XXXX XXXX XXXX ${patient.aadharLast4}` : undefined} />
              </div>
            </SubSection>
          </div>
        )}
      </div>

      {/* Contact & Address */}
      <div className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <SubSection icon={<ClipboardList className="h-4 w-4" />} title="Contact Details">
            <div className="grid grid-cols-2 gap-4">
              <DetailRow label="Mobile" value={patient.mobile} />
              <DetailRow label="Alternate Mobile" value={patient.alternateMobile} />
              <DetailRow label="Email" value={patient.email} />
              <DetailRow label="Source" value={patient.source} />
            </div>
          </SubSection>
        </div>

        {hasAddress && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <SubSection icon={<ClipboardList className="h-4 w-4" />} title="Address">
              <div className="space-y-1">
                {address?.line1 && <p className="text-sm text-foreground">{address.line1}</p>}
                {address?.line2 && <p className="text-sm text-foreground">{address.line2}</p>}
                <p className="text-sm text-muted-foreground">
                  {[address?.city, address?.state, address?.pincode].filter(Boolean).join(', ')}
                </p>
              </div>
            </SubSection>
          </div>
        )}

        {ec && (ec.name || ec.mobile) && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <SubSection icon={<AlertCircle className="h-4 w-4" />} title="Emergency Contact">
              <div className="grid grid-cols-2 gap-4">
                <DetailRow label="Name" value={ec.name} />
                <DetailRow label="Mobile" value={ec.mobile} />
                <DetailRow label="Relation" value={ec.relation} />
              </div>
            </SubSection>
          </div>
        )}

        {patient.insurance?.provider && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <SubSection icon={<Receipt className="h-4 w-4" />} title="Insurance">
              <div className="grid grid-cols-2 gap-4">
                <DetailRow label="Provider" value={patient.insurance.provider} />
                <DetailRow label="Policy Number" value={patient.insurance.policyNumber} />
                {patient.insurance.validTill && (
                  <DetailRow label="Valid Till" value={formatDate(patient.insurance.validTill)} />
                )}
              </div>
            </SubSection>
          </div>
        )}
      </div>

      {/* Notes */}
      {patient.notes && (
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <SubSection icon={<FileText className="h-4 w-4" />} title="Notes">
            <p className="text-sm text-foreground whitespace-pre-wrap">{patient.notes}</p>
          </SubSection>
        </div>
      )}
    </div>
  );
}

// ── Medical History Tab ───────────────────────────────────────────────────────

function MedicalHistoryTab({ patient }: { patient: PatientDetail }) {
  const [vitalsHistory, setVitalsHistory] = useState<VitalSignsDoc[]>([]);
  const [vitalsLoading, setVitalsLoading] = useState(true);

  useEffect(() => {
    vitalsApi.getPatientHistory(patient._id, 50)
      .then((res) => setVitalsHistory(res.data.data))
      .catch(() => {})
      .finally(() => setVitalsLoading(false));
  }, [patient._id]);

  const hasAny =
    patient.allergies?.length > 0 ||
    patient.chronicConditions?.length > 0 ||
    patient.currentMedications?.length > 0;

  return (
    <div className="space-y-5">
      {!hasAny ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
          <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">No medical history recorded</p>
          <p className="text-xs text-muted-foreground mt-1">Edit the patient to add allergies, conditions, or medications.</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <SubSection icon={<AlertCircle className="h-4 w-4 text-red-500" />} title="Known Allergies">
              <TagList
                items={patient.allergies ?? []}
                emptyText="No allergies recorded"
                colorClass="bg-red-50 text-red-700"
              />
            </SubSection>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <SubSection icon={<Activity className="h-4 w-4 text-orange-500" />} title="Chronic Conditions">
              <TagList
                items={patient.chronicConditions ?? []}
                emptyText="No chronic conditions recorded"
                colorClass="bg-orange-50 text-orange-700"
              />
            </SubSection>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <SubSection icon={<Pill className="h-4 w-4 text-blue-500" />} title="Current Medications">
              <TagList
                items={patient.currentMedications ?? []}
                emptyText="No current medications recorded"
                colorClass="bg-blue-50 text-blue-700"
              />
            </SubSection>
          </div>
        </>
      )}

      {/* Vitals history */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <SubSection icon={<Activity className="h-4 w-4 text-teal-500" />} title="Vital Signs History">
          {vitalsLoading ? (
            <div className="flex justify-center py-4"><Spinner /></div>
          ) : vitalsHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vitals recorded yet.</p>
          ) : (
            <>
              <div className="mb-5">
                <VitalsTrendChart vitals={vitalsHistory} />
              </div>
              <div className="divide-y divide-gray-50">
                {vitalsHistory.map((v) => (
                  <div key={v._id} className="py-3 first:pt-0 last:pb-0">
                    <VitalsDisplay vitals={v} />
                  </div>
                ))}
              </div>
            </>
          )}
        </SubSection>
      </div>
    </div>
  );
}

// ── Patient Visits Tab ────────────────────────────────────────────────────────

const STATUS_CFG: Record<AppointmentStatus, { label: string; dot: string; badge: string }> = {
  scheduled:   { label: 'Waiting',          dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-700'   },
  confirmed:   { label: 'Confirmed',        dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700'    },
  in_progress: { label: 'In Consultation',  dot: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700'  },
  completed:   { label: 'Completed',        dot: 'bg-green-500',  badge: 'bg-green-50 text-green-700'  },
  cancelled:   { label: 'Cancelled',        dot: 'bg-red-400',    badge: 'bg-red-50 text-red-700'      },
  no_show:     { label: 'No Show',          dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700'},
};

const MODE_LABEL: Record<string, string> = {
  walkin: 'Walk-in', scheduled: 'Scheduled', teleconsult: 'Teleconsult',
};

function consultDuration(start?: string, end?: string): string | null {
  if (!start || !end) return null;
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
  if (mins < 1) return null;
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function visitYear(appt: AppointmentItem): string {
  return new Date(appt.appointmentDate).getFullYear().toString();
}

function PatientVisitsTab({ patientId }: { patientId: string }) {
  const navigate = useNavigate();

  const [visits, setVisits]         = useState<AppointmentItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]           = useState('');
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(false);
  const [total, setTotal]           = useState(0);

  const LIMIT = 15;

  const loadPage = useCallback(async (p: number) => {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const res = await appointmentApi.list({ patientId, limit: LIMIT, page: p });
      const { data, pagination } = res.data;
      setVisits((prev) => p === 1 ? data : [...prev, ...data]);
      setHasMore(pagination.hasNext);
      setTotal(pagination.total);
      setPage(p);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [patientId]);

  useEffect(() => { loadPage(1); }, [loadPage]);

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (error)   return <Alert variant="error">{error}</Alert>;

  if (visits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-14 w-14 rounded-full bg-primary/5 flex items-center justify-center mb-3 text-primary">
          <CalendarDays className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-foreground">No visits recorded</p>
        <p className="text-xs text-muted-foreground mt-1">Appointments will appear here once booked.</p>
      </div>
    );
  }

  // Group visits by year for timeline separators
  let lastYear = '';

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="flex flex-wrap gap-4 text-sm p-3 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span><span className="font-semibold text-foreground">{total}</span> total visit{total !== 1 ? 's' : ''}</span>
        </div>
        {visits[0] && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>Last: <span className="font-semibold text-foreground">
              {new Date(visits[0].appointmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span></span>
          </div>
        )}
        {visits.filter((v) => v.status === 'completed').length > 0 && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Stethoscope className="h-4 w-4 shrink-0" />
            <span><span className="font-semibold text-foreground">
              {visits.filter((v) => v.status === 'completed').length}
            </span> completed</span>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="relative space-y-1">
        {visits.map((appt) => {
          const year      = visitYear(appt);
          const showYear  = year !== lastYear;
          lastYear        = year;
          const cfg       = STATUS_CFG[appt.status as AppointmentStatus] ?? STATUS_CFG.scheduled;
          const duration  = consultDuration(appt.consultationStartAt, appt.consultationEndAt);
          const apptDate  = new Date(appt.appointmentDate);

          return (
            <div key={appt._id}>
              {/* Year separator */}
              {showYear && (
                <div className="flex items-center gap-3 py-2 mt-2 first:mt-0">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{year}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}

              {/* Visit card */}
              <div className="flex gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                {/* Date column */}
                <div className="shrink-0 flex flex-col items-center justify-start pt-0.5 w-14 text-center">
                  <span className="text-lg font-bold text-foreground leading-none">
                    {apptDate.getDate().toString().padStart(2, '0')}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    {apptDate.toLocaleString('en-IN', { month: 'short' })}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70">{year}</span>
                  <div className={cn('mt-1.5 h-2 w-2 rounded-full', cfg.dot)} />
                </div>

                {/* Divider */}
                <div className="w-px bg-gray-100 self-stretch shrink-0" />

                {/* Main content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    {/* Left: doctor + token */}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">
                          Dr. {appt.doctor.name}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">{appt.tokenDisplay}</span>
                        <span className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                          cfg.badge
                        )}>
                          {cfg.label}
                        </span>
                      </div>

                      {/* Metadata chips */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {appt.slotStart}
                        </span>
                        <span className={cn(
                          'inline-flex items-center rounded px-1.5 py-0.5 font-medium text-[11px]',
                          appt.visitType === 'new'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-teal-50 text-teal-700'
                        )}>
                          {appt.visitType === 'new' ? 'New' : 'Follow-up'}
                        </span>
                        <span className="text-muted-foreground">{MODE_LABEL[appt.mode] ?? appt.mode}</span>
                        {duration && (
                          <span className="flex items-center gap-1 text-green-700">
                            <Clock className="h-3 w-3" /> {duration}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: action buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                      {appt.vitalSignsId && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-xs font-medium text-teal-700">
                          <HeartPulse className="h-3 w-3" /> Vitals
                        </span>
                      )}
                      {appt.prescriptionId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/prescriptions/${appt.prescriptionId}`)}
                          className="h-7 px-2 text-xs gap-1 text-primary"
                        >
                          <Pill className="h-3 w-3" /> Rx
                        </Button>
                      )}
                      {appt.invoiceId && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/billing/${appt.invoiceId}`)}
                          className="h-7 px-2 text-xs gap-1 text-green-700"
                        >
                          <Receipt className="h-3 w-3" /> Invoice
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Chief complaint */}
                  {appt.chiefComplaint && (
                    <p className="text-xs text-muted-foreground border-l-2 border-gray-200 pl-2 line-clamp-2">
                      {appt.chiefComplaint}
                    </p>
                  )}

                  {/* Cancellation reason */}
                  {appt.status === 'cancelled' && appt.cancellationReason && (
                    <p className="text-xs text-red-600 border-l-2 border-red-200 pl-2">
                      {appt.cancellationReason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            isLoading={loadingMore}
            onClick={() => loadPage(page + 1)}
          >
            Load older visits
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Patient Prescriptions Tab ─────────────────────────────────────────────────

function PatientPrescriptionsTab({ patientId }: { patientId: string }) {
  const navigate = useNavigate();
  const [rxList, setRxList]   = useState<PrescriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    prescriptionApi.list({ patientId, limit: 10 })
      .then((res) => setRxList(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (error) return <Alert variant="error">{error}</Alert>;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          Showing last {rxList.length} prescription{rxList.length !== 1 ? 's' : ''}
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/prescriptions?patientId=${patientId}`)}
          className="text-xs h-7"
        >
          View All →
        </Button>
      </div>

      {rxList.length === 0 ? (
        <div className="text-center py-10">
          <Pill className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No prescriptions yet.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Prescriptions are created from appointments.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rxList.map((rx) => (
            <div
              key={rx._id}
              onClick={() => navigate(`/prescriptions/${rx._id}`)}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-semibold text-primary">{rx.prescriptionNumber}</span>
                <div>
                  <p className="text-sm font-medium">{rx.diagnosis.slice(0, 2).join(', ')}</p>
                  <p className="text-xs text-muted-foreground">
                    {rx.medicines.length} medicine{rx.medicines.length !== 1 ? 's' : ''} · Dr. {rx.doctor.name}
                  </p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(rx.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Patient Billing Tab ───────────────────────────────────────────────────────

function PatientBillingTab({ patientId }: { patientId: string }) {
  const navigate = useNavigate();
  const user     = useAppSelector((s) => s.auth.user);
  const [invoices, setInvoices] = useState<InvoiceDoc[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    billingApi.list({ patientId, limit: 10 })
      .then((res) => setInvoices(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [patientId]);

  const canCreate = ['ClinicAdmin', 'Receptionist', 'Doctor'].includes(user?.role ?? '');

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (error) return <Alert variant="error">{error}</Alert>;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          Last {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          {canCreate && (
            <Button
              size="sm"
              onClick={() => navigate(`/billing/new?patientId=${patientId}`)}
              className="h-7 text-xs"
            >
              New Invoice
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/billing?patientId=${patientId}`)}
            className="text-xs h-7"
          >
            View All →
          </Button>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-10">
          <Receipt className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv) => {
            const cfg = PAYMENT_STATUS_CONFIG[inv.paymentStatus];
            return (
              <div
                key={inv._id}
                onClick={() => navigate(`/billing/${inv._id}`)}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-primary">{inv.invoiceNumber}</span>
                  <div>
                    <p className="text-sm font-medium">₹{inv.totalAmount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.items.length} item{inv.items.length !== 1 ? 's' : ''}
                      {inv.balanceAmount > 0 ? ` · Due: ₹${inv.balanceAmount.toFixed(2)}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(inv.invoiceDate)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Patient Lab Tab ───────────────────────────────────────────────────────────

function PatientLabTab({ patientId }: { patientId: string }) {
  const navigate = useNavigate();
  const user     = useAppSelector((s) => s.auth.user);
  const [reports, setReports] = useState<LabReportDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    labApi.list({ patientId, limit: 10 })
      .then((res) => setReports(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [patientId]);

  const canCreate = ['ClinicAdmin', 'Doctor', 'Receptionist'].includes(user?.role ?? '');

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>;
  if (error) return <Alert variant="error">{error}</Alert>;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          Last {reports.length} report{reports.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          {canCreate && (
            <Button
              size="sm"
              onClick={() => navigate(`/lab/new?patientId=${patientId}`)}
              className="h-7 text-xs"
            >
              New Report
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/lab?patientId=${patientId}`)}
            className="text-xs h-7"
          >
            View All →
          </Button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-10">
          <FlaskConical className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No lab reports yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => {
            const cfg = LAB_STATUS_CONFIG[r.status];
            return (
              <div
                key={r._id}
                onClick={() => navigate(`/lab/${r._id}`)}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-primary">{r.reportNumber}</span>
                  <div>
                    <p className="text-sm font-medium">{r.testName}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.testCategory ?? ''}
                      {r.labName ? ` · ${r.labName}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(r.reportDate)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const [patient, setPatient]     = useState<PatientDetail | null>(null);
  const [error, setError]         = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting]             = useState(false);
  const [deleteError, setDeleteError]           = useState('');

  const [showPortalDialog, setShowPortalDialog] = useState(false);
  const [portalLink, setPortalLink]             = useState('');
  const [portalExpiry, setPortalExpiry]         = useState('');
  const [portalLoading, setPortalLoading]       = useState(false);
  const [copied, setCopied]                     = useState(false);

  const user = useAppSelector((s) => s.auth.user);
  const canDelete = user?.role === 'ClinicAdmin';

  useEffect(() => {
    if (!patientId) return;
    setIsLoading(true);
    patientApi.get(patientId)
      .then((res) => setPatient(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [patientId]);

  const handleGeneratePortalLink = async () => {
    if (!patientId) return;
    setPortalLoading(true);
    try {
      const res = await portalApi.generate(patientId);
      const token = res.data.data.token;
      const link  = `${window.location.origin}/portal/${token}`;
      setPortalLink(link);
      setPortalExpiry(res.data.data.expiresAt);
      setShowPortalDialog(true);
    } catch (err) {
      // silently ignore — button stays clickable
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(portalLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDelete = async () => {
    if (!patientId) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      await patientApi.delete(patientId);
      navigate('/patients', { replace: true });
    } catch (err) {
      setDeleteError(getErrorMessage(err));
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Alert variant="error">{error || 'Patient not found.'}</Alert>
        <Button variant="outline" onClick={() => navigate('/patients')}>← Back to Patients</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Patient Header card */}
      <PatientHeader
        patient={patient}
        onEdit={() => navigate(`/patients/${patientId}/edit`)}
        onDelete={() => setShowDeleteDialog(true)}
        canDelete={canDelete}
      />

      {/* Share Portal Link */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          isLoading={portalLoading}
          onClick={handleGeneratePortalLink}
          leftIcon={<Share2 className="h-3.5 w-3.5" />}
        >
          Share Portal Link
        </Button>
      </div>

      {/* Tab bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100 scrollbar-hide">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0',
                activeTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-200'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'overview' && <OverviewTab patient={patient} />}
          {activeTab === 'medical' && <MedicalHistoryTab patient={patient} />}
          {activeTab === 'visits' && (
            <PatientVisitsTab patientId={patientId!} />
          )}
          {activeTab === 'prescriptions' && (
            <PatientPrescriptionsTab patientId={patientId!} />
          )}
          {activeTab === 'lab' && (
            <PatientLabTab patientId={patientId!} />
          )}
          {activeTab === 'billing' && (
            <PatientBillingTab patientId={patientId!} />
          )}
        </div>
      </div>

      {/* Share Portal Link dialog */}
      <Dialog
        open={showPortalDialog}
        onClose={() => { setShowPortalDialog(false); setCopied(false); }}
        title="Patient Portal Link"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share this link with <span className="font-semibold text-foreground">{patient.name}</span> to let them view their prescriptions and lab reports. No login required.
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
            <span className="flex-1 text-xs text-foreground font-mono break-all select-all">{portalLink}</span>
            <button
              onClick={handleCopyLink}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              title="Copy link"
            >
              {copied
                ? <CheckCheck className="h-4 w-4 text-green-500" />
                : <Copy className="h-4 w-4" />
              }
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Expires: {portalExpiry ? new Date(portalExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button size="sm" onClick={() => { setShowPortalDialog(false); setCopied(false); }}>
              Done
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => { setShowDeleteDialog(false); setDeleteError(''); }}
        title="Delete Patient"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-foreground">{patient.name}</span>?
            This action cannot be undone and will remove all associated records.
          </p>
          {deleteError && <Alert variant="error">{deleteError}</Alert>}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowDeleteDialog(false); setDeleteError(''); }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              isLoading={isDeleting}
              onClick={handleDelete}
            >
              Delete Patient
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
