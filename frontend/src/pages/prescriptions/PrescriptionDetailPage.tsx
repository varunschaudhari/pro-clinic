import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer, Pencil, Trash2, Download } from 'lucide-react';
import { downloadElementAsPdf } from '@/lib/pdf';

import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { Dialog } from '@/components/ui/Dialog';
import { PrescriptionPrintView } from '@/features/prescriptions/components/PrescriptionPrintView';
import { prescriptionApi } from '@/services/prescription.service';
import type { PrescriptionItem } from '@/services/prescription.service';
import { getErrorMessage } from '@/lib/utils';
import { useAppSelector } from '@/app/hooks';

export default function PrescriptionDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user     = useAppSelector((s) => s.auth.user);
  const clinic   = useAppSelector((s) => s.clinic.clinic);

  const [rx, setRx]                     = useState<PrescriptionItem | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [printing, setPrinting]         = useState(false);
  const [downloading, setDownloading]   = useState(false);
  const [showDelete, setShowDelete]     = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState('');

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

  const handleDownloadPdf = async () => {
    if (!rx) return;
    setDownloading(true);
    try {
      await downloadElementAsPdf('rx-print-area', `${rx.prescriptionNumber}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    if (!rx) return;
    setPrinting(true);
    try {
      const res = await prescriptionApi.recordPrint(rx._id);
      setRx((prev) => prev ? { ...prev, printCount: res.data.data.printCount, printedAt: res.data.data.printedAt } : prev);
    } catch {
      // print anyway even if record fails
    } finally {
      setPrinting(false);
    }
    window.print();
  };

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError('');
    try {
      await prescriptionApi.delete(rx!._id);
      navigate('/prescriptions', { replace: true });
    } catch (e) {
      setDeleteError(getErrorMessage(e));
      setDeleting(false);
    }
  };

  const canEdit = ['ClinicAdmin', 'Doctor'].includes(user?.role ?? '');

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }

  if (error || !rx) {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert variant="error">{error || 'Prescription not found'}</Alert>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header — hidden when printing */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-foreground">{rx.prescriptionNumber}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {rx.patient.name} · Dr. {rx.doctor.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              isLoading={downloading}
            >
              <Download className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              isLoading={printing}
            >
              <Printer className="h-4 w-4 mr-1" />
              Print
              {rx.printCount > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">({rx.printCount})</span>
              )}
            </Button>

            {canEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/prescriptions/${rx._id}/edit`)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDelete(true)}
                  className="text-destructive border-destructive/40 hover:bg-destructive/5"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Print area */}
        <div id="rx-print-area" className="rounded-xl border border-border bg-white p-6 print:border-0 print:p-0 print:rounded-none">
          <PrescriptionPrintView rx={rx} clinic={clinic} />
        </div>
      </div>

      {/* Delete dialog */}
      <Dialog
        open={showDelete}
        onClose={() => { setShowDelete(false); setDeleteError(''); }}
        title="Delete Prescription"
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <strong>{rx.prescriptionNumber}</strong>? This cannot be undone.
        </p>
        {deleteError && <Alert variant="error" className="mt-3">{deleteError}</Alert>}
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDelete(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            isLoading={deleting}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </>
  );
}
