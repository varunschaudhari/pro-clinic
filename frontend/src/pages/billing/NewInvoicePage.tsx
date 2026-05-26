import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { InvoiceForm } from '@/features/billing/components/InvoiceForm';
import { billingApi } from '@/services/billing.service';
import type { CreateInvoicePayload } from '@/services/billing.service';
import type { InvoiceFormValues } from '@/features/billing/components/InvoiceForm';
import { getErrorMessage } from '@/lib/utils';

function buildConsultationItem(visitType: string, apptMode: string): InvoiceFormValues['items'][0] {
  let description = 'Consultation Fee';
  let unitPrice   = 300;

  if (apptMode === 'teleconsult') {
    description = 'Teleconsultation';
    unitPrice   = 150;
  } else if (visitType === 'followup') {
    description = 'Follow-up Consultation';
    unitPrice   = 200;
  }

  return { type: 'consultation', description, hsnCode: '', quantity: 1, unitPrice, discount: 0, gstRate: 0 };
}

export default function NewInvoicePage() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  const defaultPatientId     = searchParams.get('patientId')     ?? '';
  const defaultPatientName   = searchParams.get('patientName')   ?? '';
  const defaultAppointmentId = searchParams.get('appointmentId') ?? '';
  const visitType            = searchParams.get('visitType')     ?? 'new';
  const apptMode             = searchParams.get('mode')          ?? 'walkin';

  const prefillValues: Partial<InvoiceFormValues> | undefined = defaultAppointmentId
    ? { items: [buildConsultationItem(visitType, apptMode)] }
    : undefined;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async (payload: CreateInvoicePayload) => {
    setSubmitting(true);
    setError('');
    try {
      const res = await billingApi.create(payload);
      navigate(`/billing/${res.data.data._id}`, { replace: true });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">New Invoice</h1>
          {defaultPatientName && (
            <p className="text-xs text-muted-foreground mt-0.5">For {defaultPatientName}</p>
          )}
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <InvoiceForm
        defaultValues={prefillValues}
        defaultPatientId={defaultPatientId}
        defaultPatientName={defaultPatientName}
        defaultAppointmentId={defaultAppointmentId}
        onSubmit={handleSubmit}
        isSubmitting={submitting}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
