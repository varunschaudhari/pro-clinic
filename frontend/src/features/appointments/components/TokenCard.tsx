import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertCircle, CheckCircle2, XCircle, PhoneOff, FileText, Receipt, Activity } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn, calculateAge } from '@/lib/utils';
import type { AppointmentItem, AppointmentStatus, UpdateStatusPayload } from '@/services/appointment.service';
import type { VitalSignsDoc } from '@/services/vitals.service';
import { VitalsModal } from './VitalsModal';
import { VitalsDisplay } from './VitalsDisplay';

// ── Status config ─────────────────────────────────────────────────────────────

interface StatusConfig {
  label: string;
  dot: string;
  badge: string;
}

const STATUS_CONFIG: Record<AppointmentStatus, StatusConfig> = {
  scheduled:   { label: 'Waiting',        dot: 'bg-gray-400',   badge: 'bg-gray-100 text-gray-700' },
  confirmed:   { label: 'Confirmed',      dot: 'bg-blue-400',   badge: 'bg-blue-50 text-blue-700' },
  in_progress: { label: 'In Consultation', dot: 'bg-amber-400',  badge: 'bg-amber-50 text-amber-700' },
  completed:   { label: 'Completed',      dot: 'bg-green-500',  badge: 'bg-green-50 text-green-700' },
  cancelled:   { label: 'Cancelled',      dot: 'bg-red-400',    badge: 'bg-red-50 text-red-700' },
  no_show:     { label: 'No Show',        dot: 'bg-orange-400', badge: 'bg-orange-50 text-orange-700' },
};

const MODE_LABEL: Record<string, string> = {
  walkin: 'Walk-in', scheduled: 'Scheduled', teleconsult: 'Teleconsult',
};

const VISIT_BADGE: Record<string, string> = {
  new: 'bg-purple-50 text-purple-700', followup: 'bg-teal-50 text-teal-700',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface TokenCardProps {
  appointment: AppointmentItem;
  userRole: string;
  onStatusUpdate: (id: string, payload: UpdateStatusPayload) => Promise<void>;
  onViewPatient?: (patientId: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const TokenCard = ({
  appointment: appt,
  userRole,
  onStatusUpdate,
  onViewPatient,
}: TokenCardProps) => {
  const navigate = useNavigate();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [vitalsOpen, setVitalsOpen]       = useState(false);
  const [savedVitals, setSavedVitals]     = useState<VitalSignsDoc | null>(null);

  const hasVitals = !!(appt.vitalSignsId || savedVitals);

  const cfg    = STATUS_CONFIG[appt.status];
  const isTerminal = ['completed', 'cancelled', 'no_show'].includes(appt.status);

  const handleAction = async (payload: UpdateStatusPayload, key: string) => {
    setLoadingAction(key);
    try {
      await onStatusUpdate(appt._id, payload);
    } finally {
      setLoadingAction(null);
    }
  };

  const canCheckIn  = ['scheduled', 'confirmed'].includes(appt.status);
  const canComplete = appt.status === 'in_progress' && ['Doctor', 'ClinicAdmin'].includes(userRole);
  const canNoShow   = ['scheduled', 'confirmed'].includes(appt.status);
  const canCancel   = !isTerminal;
  const canRecordVitals = ['in_progress', 'completed'].includes(appt.status) && ['Doctor', 'ClinicAdmin', 'Receptionist'].includes(userRole);
  const canPrescribe = ['in_progress', 'completed'].includes(appt.status) && ['Doctor', 'ClinicAdmin'].includes(userRole);
  const canBill      = appt.status === 'completed' && ['ClinicAdmin', 'Receptionist'].includes(userRole);

  const p = appt.patient;
  const age = p.dob
    ? `${calculateAge(p.dob)} yrs`
    : p.age != null
    ? `${p.age}${p.ageUnit === 'years' ? ' yrs' : ' ' + p.ageUnit}`
    : null;

  return (
    <div
      className={cn(
        'bg-white rounded-xl border shadow-sm transition-all hover:shadow-md',
        appt.status === 'in_progress' ? 'border-amber-200 ring-1 ring-amber-100' : 'border-gray-100'
      )}
    >
      <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Token badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className={cn(
              'h-12 w-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
              appt.status === 'in_progress'
                ? 'bg-amber-50 text-amber-700 ring-2 ring-amber-300'
                : appt.status === 'completed'
                ? 'bg-green-50 text-green-700'
                : 'bg-gray-50 text-gray-700'
            )}
          >
            {appt.tokenDisplay}
          </div>

          {/* Status dot (mobile only) */}
          <div className="sm:hidden flex flex-col">
            <span className="text-xs font-semibold text-foreground">{p.name}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
              {cfg.label}
            </span>
          </div>
        </div>

        {/* Patient info */}
        <div className="flex-1 min-w-0 hidden sm:block">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="font-semibold text-foreground cursor-pointer hover:text-primary transition-colors"
              onClick={() => onViewPatient?.(p._id)}
            >
              {p.name}
            </span>
            <span className="text-xs text-muted-foreground font-mono">{p.patientId}</span>
            <span
              className={cn(
                'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium capitalize',
                p.gender === 'male'   ? 'bg-blue-50 text-blue-700'   :
                p.gender === 'female' ? 'bg-pink-50 text-pink-700'   :
                'bg-purple-50 text-purple-700'
              )}
            >
              {p.gender}
            </span>
            {age && <span className="text-xs text-muted-foreground">{age}</span>}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              {appt.slotStart}
            </span>

            <span
              className={cn(
                'inline-flex items-center rounded px-1.5 py-0.5 font-medium capitalize',
                VISIT_BADGE[appt.visitType]
              )}
            >
              {appt.visitType === 'new' ? 'New' : 'Follow-up'}
            </span>

            <span className="text-muted-foreground">{MODE_LABEL[appt.mode] ?? appt.mode}</span>

            {appt.chiefComplaint && (
              <span className="text-muted-foreground truncate max-w-[200px]">
                · {appt.chiefComplaint}
              </span>
            )}
          </div>
        </div>

        {/* Right: status + actions */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {/* Status badge */}
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', cfg.badge)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
            {cfg.label}
          </span>

          {/* Action buttons */}
          {!isTerminal && (
            <div className="flex items-center gap-1.5">
              {canCheckIn && (
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={loadingAction === 'in_progress'}
                  onClick={() => handleAction({ status: 'in_progress' }, 'in_progress')}
                  leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                >
                  Check In
                </Button>
              )}
              {canComplete && (
                <Button
                  size="sm"
                  isLoading={loadingAction === 'completed'}
                  onClick={() => handleAction({ status: 'completed' }, 'completed')}
                  leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                >
                  Complete
                </Button>
              )}
              {canNoShow && (
                <Button
                  size="sm"
                  variant="outline"
                  isLoading={loadingAction === 'no_show'}
                  onClick={() => handleAction({ status: 'no_show' }, 'no_show')}
                  leftIcon={<PhoneOff className="h-3.5 w-3.5" />}
                >
                  No Show
                </Button>
              )}
              {canCancel && (
                <Button
                  size="sm"
                  variant="ghost"
                  isLoading={loadingAction === 'cancelled'}
                  onClick={() => handleAction({ status: 'cancelled', cancellationReason: 'Cancelled by staff' }, 'cancelled')}
                  leftIcon={<XCircle className="h-3.5 w-3.5" />}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}

          {canRecordVitals && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setVitalsOpen(true)}
              leftIcon={<Activity className="h-3.5 w-3.5" />}
              className={cn(
                hasVitals
                  ? 'border-green-500/40 text-green-700 hover:bg-green-50'
                  : 'border-orange-400/40 text-orange-600 hover:bg-orange-50'
              )}
            >
              {hasVitals ? 'Vitals ✓' : 'Vitals'}
            </Button>
          )}
          {canPrescribe && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/prescriptions/new?appointmentId=${appt._id}`)}
              leftIcon={<FileText className="h-3.5 w-3.5" />}
              className="border-primary/40 text-primary hover:bg-primary/5"
            >
              Prescribe
            </Button>
          )}
          {canBill && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/billing/new?appointmentId=${appt._id}&patientId=${appt.patient._id}`)}
              leftIcon={<Receipt className="h-3.5 w-3.5" />}
              className="border-green-500/40 text-green-700 hover:bg-green-50"
            >
              Invoice
            </Button>
          )}

          {appt.status === 'completed' && appt.consultationEndAt && (
            <span className="text-xs text-muted-foreground">
              {new Date(appt.consultationEndAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Consultation started indicator */}
      {appt.status === 'in_progress' && (
        <div className="px-4 pb-3 pt-0 flex items-center gap-1.5 text-xs text-amber-600">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Consultation in progress</span>
          {appt.consultationStartAt && (
            <span>· started at {new Date(appt.consultationStartAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          )}
        </div>
      )}

      {/* Compact vitals strip (shown when freshly saved in this session) */}
      {savedVitals && (
        <div className="px-4 pb-3 pt-0 border-t border-gray-50">
          <VitalsDisplay vitals={savedVitals} compact />
        </div>
      )}

      {/* Vitals modal */}
      {vitalsOpen && (
        <VitalsModal
          open={vitalsOpen}
          onClose={() => setVitalsOpen(false)}
          appointmentId={appt._id}
          patientId={appt.patient._id}
          onSuccess={(v) => setSavedVitals(v)}
        />
      )}
    </div>
  );
};
