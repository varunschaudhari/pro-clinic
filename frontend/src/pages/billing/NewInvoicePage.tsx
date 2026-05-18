import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { InvoiceForm } from '@/features/billing/components/InvoiceForm';
import { billingApi } from '@/services/billing.service';
import type { CreateInvoicePayload } from '@/services/billing.service';
import { getErrorMessage } from '@/lib/utils';

export default function NewInvoicePage() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  const defaultPatientId    = searchParams.get('patientId')     ?? '';
  const defaultPatientName  = searchParams.get('patientName')   ?? '';
  const defaultAppointmentId = searchParams.get('appointmentId') ?? '';

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
        <h1 className="text-xl font-semibold text-foreground">New Invoice</h1>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <InvoiceForm
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
