import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { PrescriptionForm } from '@/features/prescriptions/components/PrescriptionForm';
import { prescriptionApi } from '@/services/prescription.service';
import type { CreatePrescriptionPayload, UpdatePrescriptionPayload } from '@/services/prescription.service';
import { getErrorMessage } from '@/lib/utils';
import { useAppSelector } from '@/app/hooks';

export default function NewPrescriptionPage() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const appointmentId  = searchParams.get('appointmentId') ?? '';

  const user = useAppSelector((s) => s.auth.user);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async (payload: CreatePrescriptionPayload | UpdatePrescriptionPayload) => {
    if (!appointmentId) {
      setError('No appointment ID provided. Please open this page from an appointment.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await prescriptionApi.create(payload as CreatePrescriptionPayload);
      navigate(`/prescriptions/${res.data.data._id}`, { replace: true });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">New Prescription</h1>
          {appointmentId && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Appointment: {appointmentId}
            </p>
          )}
        </div>
      </div>

      {!appointmentId && (
        <Alert variant="error">
          No appointment linked. Please create a prescription from an appointment.
        </Alert>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      <PrescriptionForm
        appointmentId={appointmentId}
        onSubmit={handleSubmit}
        isSubmitting={submitting}
        onCancel={() => navigate(-1)}
        userRole={user?.role}
      />
    </div>
  );
}
