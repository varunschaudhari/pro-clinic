import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { PrescriptionForm } from '@/features/prescriptions/components/PrescriptionForm';
import type { PrescriptionFormValues } from '@/features/prescriptions/components/PrescriptionForm';
import { prescriptionApi } from '@/services/prescription.service';
import type { PrescriptionItem, CreatePrescriptionPayload, UpdatePrescriptionPayload } from '@/services/prescription.service';
import { getErrorMessage } from '@/lib/utils';
import { useAppSelector } from '@/app/hooks';

const rxToFormValues = (rx: PrescriptionItem): Partial<PrescriptionFormValues> => {
  const medicines = rx.medicines.map((m) => {
    const durationParts = m.duration.split(' ');
    const dv   = durationParts[0] ?? '5';
    const unit = durationParts[1] as 'days' | 'weeks' | 'months';

    return {
      name:          m.name,
      genericName:   m.genericName ?? '',
      dosage:        m.dosage,
      frequency:     m.frequency,
      durationValue: dv,
      durationUnit:  (['days', 'weeks', 'months'] as const).includes(unit) ? unit : 'days',
      unit:          m.unit,
      route:         m.route ?? 'oral',
      instructions:  m.instructions ?? '',
      quantity:      m.quantity != null ? String(m.quantity) : '',
    };
  });

  const labTests = rx.labTests.map((t) => ({
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
};

export default function EditPrescriptionPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const user = useAppSelector((s) => s.auth.user);
  const [rx, setRx]             = useState<PrescriptionItem | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [submitting, setSub]    = useState(false);
  const [submitErr, setSubErr]  = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await prescriptionApi.get(id!);
        setRx(res.data.data);
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSubmit = async (payload: CreatePrescriptionPayload | UpdatePrescriptionPayload) => {
    setSub(true);
    setSubErr('');
    try {
      await prescriptionApi.update(id!, payload as UpdatePrescriptionPayload);
      navigate(`/prescriptions/${id}`, { replace: true });
    } catch (e) {
      setSubErr(getErrorMessage(e));
    } finally {
      setSub(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert variant="error">{error}</Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Edit Prescription</h1>
          {rx && (
            <p className="text-xs text-muted-foreground mt-0.5">{rx.prescriptionNumber}</p>
          )}
        </div>
      </div>

      {submitErr && <Alert variant="error">{submitErr}</Alert>}

      {rx && (
        <PrescriptionForm
          defaultValues={rxToFormValues(rx)}
          onSubmit={handleSubmit}
          isEdit
          isSubmitting={submitting}
          onCancel={() => navigate(-1)}
          userRole={user?.role}
        />
      )}
    </div>
  );
}
