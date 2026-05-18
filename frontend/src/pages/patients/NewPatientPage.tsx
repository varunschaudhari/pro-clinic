import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { PatientForm } from '@/features/patients/components/PatientForm';
import { patientApi } from '@/services/patient.service';
import type { CreatePatientPayload } from '@/services/patient.service';
import { getErrorMessage } from '@/lib/utils';
import { toast } from 'sonner';

export default function NewPatientPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState('');

  const handleSubmit = async (data: CreatePatientPayload) => {
    setIsLoading(true);
    setError('');
    try {
      const res = await patientApi.create(data);
      toast.success('Patient registered successfully');
      navigate(`/patients/${res.data.data._id}`, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/patients')}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Back to Patients
        </Button>
      </div>

      <div>
        <h1 className="text-xl font-bold text-foreground">Register New Patient</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Fill in the required fields. Additional details can be added later.
        </p>
      </div>

      {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}

      <PatientForm
        mode="create"
        isLoading={isLoading}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/patients')}
      />
    </div>
  );
}
