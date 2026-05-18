import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FlaskConical, Plus } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { labApi } from '@/services/labReport.service';
import type { LabReportDoc } from '@/services/labReport.service';
import { LAB_STATUS_CONFIG } from '@/constants/labReport';
import type { LabStatus } from '@/constants/labReport';
import { getErrorMessage, formatDate } from '@/lib/utils';
import { useAppSelector } from '@/app/hooks';

const STATUS_FILTERS: { value: LabStatus | ''; label: string }[] = [
  { value: '',                label: 'All' },
  { value: 'ordered',         label: 'Ordered' },
  { value: 'sample_collected',label: 'Sample Collected' },
  { value: 'processing',      label: 'Processing' },
  { value: 'completed',       label: 'Completed' },
  { value: 'cancelled',       label: 'Cancelled' },
];

export default function LabPage() {
  const navigate      = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user          = useAppSelector((s) => s.auth.user);

  const [reports, setReports] = useState<LabReportDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const LIMIT = 20;

  const patientId    = searchParams.get('patientId') ?? undefined;
  const statusFilter = (searchParams.get('status') ?? '') as LabStatus | '';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await labApi.list({
        patientId,
        status: statusFilter || undefined,
        page,
        limit: LIMIT,
      });
      setReports(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [patientId, statusFilter, page]);

  const totalPages = Math.ceil(total / LIMIT) || 1;
  const canCreate  = ['ClinicAdmin', 'Doctor', 'Receptionist'].includes(user?.role ?? '');

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Lab Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} report{total !== 1 ? 's' : ''}</p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate('/lab/new')} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Report
          </Button>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-border pb-0 overflow-x-auto scrollbar-hide">
        {STATUS_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => {
              setPage(1);
              const p = new URLSearchParams(searchParams);
              if (value) p.set('status', value);
              else p.delete('status');
              setSearchParams(p);
            }}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              statusFilter === value
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FlaskConical className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No lab reports found</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Report No.</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Test</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Patient</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Lab</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reports.map((r) => {
                  const cfg = LAB_STATUS_CONFIG[r.status];
                  return (
                    <tr
                      key={r._id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/lab/${r._id}`)}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">
                        {r.reportNumber}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.testName}</p>
                        {r.testCategory && (
                          <p className="text-xs text-muted-foreground">{r.testCategory}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.patient.name}</p>
                        <p className="text-xs text-muted-foreground">{r.patient.patientId}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(r.reportDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.labName ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground self-center">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
