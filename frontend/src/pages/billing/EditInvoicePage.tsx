import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { InvoiceForm } from '@/features/billing/components/InvoiceForm';
import { billingApi } from '@/services/billing.service';
import type { InvoiceDoc, CreateInvoicePayload } from '@/services/billing.service';
import { getErrorMessage } from '@/lib/utils';

function invoiceToFormValues(inv: InvoiceDoc) {
  return {
    patientId:          inv.patient._id,
    patientName:        inv.patient.name,
    appointmentId:      inv.appointmentId ?? '',
    items:              inv.items.map((item) => ({
      type:        item.type,
      description: item.description,
      hsnCode:     item.hsnCode ?? '',
      quantity:    item.quantity,
      unitPrice:   item.unitPrice,
      discount:    item.discount,
      gstRate:     item.gstRate,
    })),
    isInterState:       inv.isInterState,
    clinicGstin:        inv.clinicGstin  ?? '',
    patientGstin:       inv.patientGstin ?? '',
    notes:              inv.notes              ?? '',
    termsAndConditions: inv.termsAndConditions ?? '',
    dueDate:            inv.dueDate ? inv.dueDate.slice(0, 10) : '',
  };
}

export default function EditInvoicePage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice]   = useState<InvoiceDoc | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    billingApi.get(id!)
      .then((res) => {
        const inv = res.data.data;
        if (inv.paidAmount > 0) {
          setError('This invoice has recorded payments and cannot be edited.');
        } else if (inv.isCancelled) {
          setError('Cancelled invoices cannot be edited.');
        } else {
          setInvoice(inv);
        }
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (payload: CreateInvoicePayload) => {
    setSubmitting(true);
    setSubmitError('');
    try {
      const { patientId: _, appointmentId: __, ...updateData } = payload;
      await billingApi.update(id!, updateData);
      navigate(`/billing/${id}`, { replace: true });
    } catch (e) {
      setSubmitError(getErrorMessage(e));
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  if (error || !invoice) return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <Alert variant="error">{error || 'Invoice not found'}</Alert>
    </div>
  );

  const defaultValues = invoiceToFormValues(invoice);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Edit Invoice</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{invoice.invoiceNumber} · {invoice.patient.name}</p>
        </div>
      </div>

      {submitError && <Alert variant="error">{submitError}</Alert>}

      <InvoiceForm
        mode="edit"
        defaultValues={defaultValues}
        defaultPatientId={invoice.patient._id}
        defaultPatientName={invoice.patient.name}
        defaultAppointmentId={invoice.appointmentId ?? ''}
        onSubmit={handleSubmit}
        isSubmitting={submitting}
        onCancel={() => navigate(`/billing/${id}`)}
      />
    </div>
  );
}
