import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Printer, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { Dialog } from '@/components/ui/Dialog';
import { LabReportPrintView } from '@/features/lab/components/LabReportPrintView';
import { FileAttachmentsPanel } from '@/features/lab/components/FileAttachmentsPanel';
import { labApi } from '@/services/labReport.service';
import type { LabReportDoc } from '@/services/labReport.service';
import { LAB_STATUS_CONFIG } from '@/constants/labReport';
import type { LabStatus } from '@/constants/labReport';
import { getErrorMessage } from '@/lib/utils';
import { useAppSelector } from '@/app/hooks';

export default function LabReportDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user     = useAppSelector((s) => s.auth.user);
  const clinic   = useAppSelector((s) => s.clinic.clinic);

  const [report, setReport]   = useState<LabReportDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const [transitioning, setTransitioning] = useState(false);
  const [transitionErr, setTransitionErr] = useState('');

  const [showDelete, setShowDelete]   = useState(false);
  const [deleting, setDeleting]       = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    labApi.get(id!)
      .then((res) => setReport(res.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusTransition = async (nextStatus: LabStatus) => {
    if (!report) return;
    setTransitioning(true);
    setTransitionErr('');
    try {
      const res = await labApi.updateStatus(id!, { status: nextStatus });
      setReport(res.data.data);
    } catch (e) {
      setTransitionErr(getErrorMessage(e));
    } finally {
      setTransitioning(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await labApi.delete(id!);
      navigate('/lab', { replace: true });
    } catch (e) {
      setDeleteError(getErrorMessage(e));
      setDeleting(false);
    }
  };

  const canEdit   = ['ClinicAdmin', 'Doctor', 'Receptionist'].includes(user?.role ?? '');
  const canDelete = ['ClinicAdmin', 'Doctor'].includes(user?.role ?? '');

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error || !report) return (
    <div className="max-w-4xl mx-auto"><Alert variant="error">{error || 'Report not found'}</Alert></div>
  );

  const statusCfg  = LAB_STATUS_CONFIG[report.status];
  const nextStates = statusCfg.next;

  const statusActionLabel: Record<string, string> = {
    sample_collected: 'Mark Sample Collected',
    processing:       'Mark Processing',
    completed:        'Mark Completed',
    cancelled:        'Cancel',
  };

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">{report.reportNumber}</h1>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusCfg.badge}`}>
                  {statusCfg.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {report.patient.name} · {report.testName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status transition buttons */}
            {canEdit && nextStates.map((next) => (
              <Button
                key={next}
                size="sm"
                variant={next === 'cancelled' ? 'outline' : 'primary'}
                className={next === 'cancelled' ? 'text-destructive border-destructive/40 hover:bg-destructive/5' : ''}
                isLoading={transitioning}
                onClick={() => handleStatusTransition(next)}
              >
                {statusActionLabel[next] ?? next}
              </Button>
            ))}

            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>

            {canEdit && report.status !== 'cancelled' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/lab/${report._id}/edit`)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}

            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDelete(true)}
                className="text-destructive hover:text-destructive h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {transitionErr && (
          <Alert variant="error" className="print:hidden">{transitionErr}</Alert>
        )}

        {/* Report print area */}
        <div className="rounded-xl border border-border bg-white p-6 print:border-0 print:p-0 print:rounded-none">
          <LabReportPrintView report={report} clinic={clinic} />
        </div>

        {/* File attachments */}
        <div className="rounded-xl border border-border bg-white p-5 print:hidden">
          <FileAttachmentsPanel
            reportId={report._id}
            fileUrls={report.fileUrls}
            onChange={(urls) => setReport((r) => r ? { ...r, fileUrls: urls } : r)}
            readOnly={!canEdit || report.status === 'cancelled'}
          />
        </div>
      </div>

      {/* Delete dialog */}
      <Dialog
        open={showDelete}
        onClose={() => { setShowDelete(false); setDeleteError(''); }}
        title="Delete Lab Report"
        size="sm"
      >
        <p className="text-sm text-muted-foreground">
          Permanently delete <strong>{report.reportNumber}</strong>? This cannot be undone.
        </p>
        {deleteError && <Alert variant="error" className="mt-2">{deleteError}</Alert>}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => setShowDelete(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" isLoading={deleting} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Dialog>
    </>
  );
}
