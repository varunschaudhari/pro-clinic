import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { downloadElementAsPdf } from '@/lib/pdf';

import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { CreditNotePrintView } from '@/features/billing/components/CreditNotePrintView';
import { billingApi } from '@/services/billing.service';
import type { CreditNoteDoc } from '@/services/billing.service';
import { getErrorMessage } from '@/lib/utils';
import { useAppSelector } from '@/app/hooks';

export default function CreditNotePage() {
  const { cnId }  = useParams<{ cnId: string }>();
  const navigate  = useNavigate();
  const clinic    = useAppSelector((s) => s.clinic.clinic);

  const [cn, setCn]               = useState<CreditNoteDoc | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    billingApi.getCreditNote(cnId!)
      .then((res) => setCn(res.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [cnId]);

  const handleDownload = async () => {
    if (!cn) return;
    setDownloading(true);
    try {
      await downloadElementAsPdf('cn-print-area', `${cn.creditNoteNumber}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error || !cn) return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <Alert variant="error">{error || 'Credit note not found'}</Alert>
    </div>
  );

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header — hidden when printing */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/billing/${cn.invoiceId}`)} className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">{cn.creditNoteNumber}</h1>
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-red-50 text-red-700 border-red-200">
                  Credit Note
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {cn.patient.name} · Against {cn.invoiceNumber} · ₹{cn.amount.toFixed(2)} refunded
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" isLoading={downloading} onClick={handleDownload}>
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
          </div>
        </div>

        {/* Print area */}
        <div className="rounded-xl border border-border bg-white p-6 print:border-0 print:p-0 print:rounded-none">
          <CreditNotePrintView cn={cn} clinic={clinic} />
        </div>
      </div>
    </>
  );
}
