import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { AppointmentForm } from '@/features/appointments/components/AppointmentForm';
import { appointmentApi } from '@/services/appointment.service';
import type { CreateAppointmentPayload } from '@/services/appointment.service';
import { useAppSelector } from '@/app/hooks';
import { getErrorMessage } from '@/lib/utils';

export default function NewAppointmentPage() {
  const navigate      = useNavigate();
  const [params]      = useSearchParams();
  const user          = useAppSelector((s) => s.auth.user);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState('');

  // Pre-fill date from query param (e.g. /appointments/new?date=2024-01-15)
  const defaultDate     = params.get('date') ?? undefined;
  const defaultDoctorId = params.get('doctorId') ?? undefined;

  const handleSubmit = async (data: CreateAppointmentPayload) => {
    setIsLoading(true);
    setError('');
    try {
      await appointmentApi.create(data);
      navigate('/appointments', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Header */}
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
        <h1 className="text-xl font-bold text-foreground">Book Appointment</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Register a walk-in or schedule an appointment
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        {error && (
          <Alert variant="error" onClose={() => setError('')} className="mb-5">
            {error}
          </Alert>
        )}

        <AppointmentForm
          userRole={user?.role ?? ''}
          userId={user?.id ?? ''}
          defaultDate={defaultDate}
          defaultDoctorId={defaultDoctorId}
          isLoading={isLoading}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/appointments')}
        />
      </div>
    </div>
  );
}
