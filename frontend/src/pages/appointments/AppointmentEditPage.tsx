import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { AppointmentForm } from '@/features/appointments/components/AppointmentForm';
import type { AppointmentInitialValues } from '@/features/appointments/components/AppointmentForm';
import { appointmentApi } from '@/services/appointment.service';
import type { CreateAppointmentPayload, UpdateAppointmentPayload } from '@/services/appointment.service';
import { useAppSelector } from '@/app/hooks';
import { getErrorMessage } from '@/lib/utils';

export default function AppointmentEditPage() {
  const { id }    = useParams<{ id: string }>();
  const navigate  = useNavigate();
  const user      = useAppSelector((s) => s.auth.user);

  const [initialValues, setInitialValues] = useState<AppointmentInitialValues | null>(null);
  const [fetchError, setFetchError]       = useState('');
  const [saveError, setSaveError]         = useState('');
  const [isSaving, setIsSaving]           = useState(false);

  useEffect(() => {
    if (!id) return;
    appointmentApi.get(id)
      .then((res) => {
        const appt = res.data.data;

        // Guard: non-editable statuses redirect back
        if (['completed', 'cancelled', 'no_show', 'in_progress'].includes(appt.status)) {
          navigate('/appointments', { replace: true });
          return;
        }

        const p = appt.patient;
        setInitialValues({
          patientId:      p._id,
          patientDisplay: `${p.name} · ${p.patientId} · ${p.mobile}`,
          doctorId:       appt.doctor._id,
          appointmentDate: appt.appointmentDate.slice(0, 10),
          slotStart:      appt.slotStart,
          slotEnd:        appt.slotEnd,
          mode:           appt.mode,
          visitType:      appt.visitType,
          chiefComplaint: appt.chiefComplaint,
          notes:          appt.notes,
        });
      })
      .catch(() => setFetchError('Failed to load appointment'));
  }, [id, navigate]);

  const handleSubmit = async (data: CreateAppointmentPayload | UpdateAppointmentPayload) => {
    if (!id) return;
    setIsSaving(true);
    setSaveError('');
    try {
      await appointmentApi.update(id, data as UpdateAppointmentPayload);
      navigate('/appointments', { replace: true });
    } catch (err) {
      setSaveError(getErrorMessage(err));
      setIsSaving(false);
    }
  };

  if (fetchError) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <Alert variant="error">{fetchError}</Alert>
        <Button variant="ghost" onClick={() => navigate('/appointments')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Back to Queue
        </Button>
      </div>
    );
  }

  if (!initialValues) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/appointments')}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Back to Queue
        </Button>
      </div>

      <div>
        <h1 className="text-xl font-bold text-foreground">Edit Appointment</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Update doctor, date, time, or visit details
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        {saveError && (
          <Alert variant="error" onClose={() => setSaveError('')} className="mb-5">
            {saveError}
          </Alert>
        )}

        <AppointmentForm
          userRole={user?.role ?? ''}
          userId={user?.id ?? ''}
          initialValues={initialValues}
          isLoading={isSaving}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/appointments')}
        />
      </div>
    </div>
  );
}
