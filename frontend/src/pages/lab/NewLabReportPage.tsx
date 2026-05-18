import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { LabReportForm } from '@/features/lab/components/LabReportForm';
import { labApi } from '@/services/labReport.service';
import type { CreateLabReportPayload, UpdateLabReportPayload } from '@/services/labReport.service';
import { getErrorMessage } from '@/lib/utils';

export default function NewLabReportPage() {
  const navigate      = useNavigate();
  const [searchParams] = useSearchParams();

  const patientId      = searchParams.get('patientId')     ?? undefined;
  const appointmentId  = searchParams.get('appointmentId') ?? undefined;
  const prescriptionId = searchParams.get('prescriptionId') ?? undefined;
  const testName       = searchParams.get('testName')      ?? '';

  const [submitting, setSub] = useState(false);
  const [submitErr, setSubErr] = useState('');

  const handleSubmit = async (payload: CreateLabReportPayload | UpdateLabReportPayload) => {
    setSub(true);
    setSubErr('');
    try {
      const res = await labApi.create(payload as CreateLabReportPayload);
      navigate(`/lab/${res.data.data._id}`, { replace: true });
    } catch (e) {
      setSubErr(getErrorMessage(e));
    } finally {
      setSub(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">New Lab Report</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {appointmentId ? 'Linked to appointment' : patientId ? 'For patient' : 'Stand-alone report'}
          </p>
        </div>
      </div>

      {submitErr && <Alert variant="error">{submitErr}</Alert>}

      <LabReportForm
        defaultTestName={testName}
        onSubmit={handleSubmit}
        patientId={patientId}
        appointmentId={appointmentId}
        prescriptionId={prescriptionId}
        isSubmitting={submitting}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
