import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { LabReportForm } from '@/features/lab/components/LabReportForm';
import type { LabReportFormValues } from '@/features/lab/components/LabReportForm';
import { labApi } from '@/services/labReport.service';
import type { LabReportDoc, CreateLabReportPayload, UpdateLabReportPayload } from '@/services/labReport.service';
import { getErrorMessage } from '@/lib/utils';

const reportToFormValues = (r: LabReportDoc): Partial<LabReportFormValues> => ({
  testName:          r.testName,
  testCategory:      r.testCategory      ?? '',
  labName:           r.labName           ?? '',
  labAddress:        r.labAddress        ?? '',
  labContactNo:      r.labContactNo      ?? '',
  sampleType:        r.sampleType        ?? '',
  sampleCollectedAt: r.sampleCollectedAt ? r.sampleCollectedAt.slice(0, 10) : '',
  reportDate:        r.reportDate        ? r.reportDate.slice(0, 10)        : '',
  results:           r.results.map((res) => ({
    parameter:      res.parameter,
    value:          res.value,
    unit:           res.unit           ?? '',
    referenceRange: res.referenceRange ?? '',
    isAbnormal:     res.isAbnormal     ?? false,
    flags:          res.flags,
  })),
  interpretation: r.interpretation ?? '',
  remarks:        r.remarks        ?? '',
  doctorComment:  r.doctorComment  ?? '',
  fileUrls:       r.fileUrls,
});

export default function EditLabReportPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport]   = useState<LabReportDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [submitting, setSub]  = useState(false);
  const [submitErr, setSubErr] = useState('');

  useEffect(() => {
    labApi.get(id!)
      .then((res) => setReport(res.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (payload: CreateLabReportPayload | UpdateLabReportPayload) => {
    setSub(true);
    setSubErr('');
    try {
      await labApi.update(id!, payload as UpdateLabReportPayload);
      navigate(`/lab/${id}`, { replace: true });
    } catch (e) {
      setSubErr(getErrorMessage(e));
    } finally {
      setSub(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error) return (
    <div className="max-w-4xl mx-auto"><Alert variant="error">{error}</Alert></div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Edit Lab Report</h1>
          {report && (
            <p className="text-xs text-muted-foreground mt-0.5">{report.reportNumber}</p>
          )}
        </div>
      </div>

      {submitErr && <Alert variant="error">{submitErr}</Alert>}

      {report && (
        <LabReportForm
          defaultValues={reportToFormValues(report)}
          onSubmit={handleSubmit}
          isEdit
          isSubmitting={submitting}
          onCancel={() => navigate(-1)}
        />
      )}
    </div>
  );
}
