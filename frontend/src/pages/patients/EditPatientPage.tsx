import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { PatientForm } from '@/features/patients/components/PatientForm';
import type { PatientFormValues } from '@/features/patients/components/PatientForm';
import { patientApi } from '@/services/patient.service';
import type { PatientDetail, UpdatePatientPayload } from '@/services/patient.service';
import { getErrorMessage } from '@/lib/utils';

function detailToFormValues(p: PatientDetail): Partial<PatientFormValues> {
  return {
    name: p.name,
    mobile: p.mobile,
    gender: p.gender,
    ageMode: p.dob ? 'dob' : 'age',
    dob: p.dob ?? undefined,
    age: p.age ?? undefined,
    ageUnit: (p.ageUnit as PatientFormValues['ageUnit']) ?? 'years',
    bloodGroup: p.bloodGroup ?? '',
    height: p.height ?? undefined,
    weight: p.weight ?? undefined,
    alternateMobile: p.alternateMobile ?? '',
    email: p.email ?? '',
    addressLine1: p.address?.line1 ?? '',
    addressLine2: p.address?.line2 ?? '',
    city: p.address?.city ?? '',
    state: p.address?.state ?? '',
    pincode: p.address?.pincode ?? '',
    emergencyName: p.emergencyContact?.name ?? '',
    emergencyMobile: p.emergencyContact?.mobile ?? '',
    emergencyRelation: p.emergencyContact?.relation ?? '',
    allergies: p.allergies ?? [],
    chronicConditions: p.chronicConditions ?? [],
    currentMedications: p.currentMedications ?? [],
    insuranceProvider: p.insurance?.provider ?? '',
    insurancePolicyNumber: p.insurance?.policyNumber ?? '',
    insuranceValidTill: p.insurance?.validTill ?? '',
    aadharLast4: p.aadharLast4 ?? '',
    abhaId: p.abhaId ?? '',
    source:   p.source ?? '',
    notes:    p.notes ?? '',
    smsOptIn: (p as any).smsOptIn ?? true,
  };
}

export default function EditPatientPage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();

  const [patient, setPatient]   = useState<PatientDetail | null>(null);
  const [fetchError, setFetchError] = useState('');
  const [isFetching, setIsFetching] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError]     = useState('');

  useEffect(() => {
    if (!patientId) return;
    setIsFetching(true);
    patientApi.get(patientId)
      .then((res) => setPatient(res.data.data))
      .catch((err) => setFetchError(getErrorMessage(err)))
      .finally(() => setIsFetching(false));
  }, [patientId]);

  const handleSubmit = async (data: UpdatePatientPayload) => {
    if (!patientId) return;
    setSaveLoading(true);
    setSaveError('');
    try {
      await patientApi.update(patientId, data);
      navigate(`/patients/${patientId}`, { replace: true });
    } catch (err) {
      setSaveError(getErrorMessage(err));
      setSaveLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (fetchError || !patient) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Alert variant="error">{fetchError || 'Patient not found.'}</Alert>
        <Button variant="outline" onClick={() => navigate('/patients')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
          Back to Patients
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/patients/${patientId}`)}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Back to Patient
        </Button>
      </div>

      <div>
        <h1 className="text-xl font-bold text-foreground">Edit Patient</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{patient.name} · {patient.patientId}</p>
      </div>

      {saveError && <Alert variant="error" onClose={() => setSaveError('')}>{saveError}</Alert>}

      <PatientForm
        mode="edit"
        defaultValues={detailToFormValues(patient)}
        isLoading={saveLoading}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/patients/${patientId}`)}
      />
    </div>
  );
}
