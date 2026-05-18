import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Plus, Printer, Eye } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { TableSkeleton } from '@/components/ui/TableSkeleton';
import { Badge } from '@/components/ui/Badge';
import { prescriptionApi } from '@/services/prescription.service';
import type { PrescriptionItem } from '@/services/prescription.service';
import { getErrorMessage, formatDate } from '@/lib/utils';
import { useAppSelector } from '@/app/hooks';

export default function PrescriptionsPage() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const user           = useAppSelector((s) => s.auth.user);

  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [total, setTotal]                 = useState(0);
  const [page, setPage]                   = useState(1);
  const LIMIT = 20;

  const patientId = searchParams.get('patientId') ?? undefined;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await prescriptionApi.list({ patientId, page, limit: LIMIT });
        setPrescriptions(res.data.data);
        setTotal(res.data.pagination.total);
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [patientId, page]);

  const totalPages = Math.ceil(total / LIMIT) || 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Prescriptions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} prescription{total !== 1 ? 's' : ''}
          </p>
        </div>
        {['ClinicAdmin', 'Doctor'].includes(user?.role ?? '') && (
          <Button onClick={() => navigate('/prescriptions/new')} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Prescription
          </Button>
        )}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <TableSkeleton rows={6} cols={7} />
          </table>
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-foreground">No prescriptions found</p>
          <p className="text-xs text-muted-foreground mt-1">Write your first prescription to get started</p>
          {['ClinicAdmin', 'Doctor'].includes(user?.role ?? '') && (
            <Button size="sm" className="mt-4" onClick={() => navigate('/prescriptions/new')}>
              <Plus className="h-4 w-4 mr-1" /> New Prescription
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Rx No.</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Patient</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Doctor</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Diagnosis</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Prints</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {prescriptions.map((rx) => (
                  <tr
                    key={rx._id}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => navigate(`/prescriptions/${rx._id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">
                      {rx.prescriptionNumber}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{rx.patient.name}</p>
                      <p className="text-xs text-muted-foreground">{rx.patient.patientId}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">Dr. {rx.doctor.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {rx.diagnosis.slice(0, 2).map((d, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {d.length > 25 ? d.slice(0, 25) + '…' : d}
                          </Badge>
                        ))}
                        {rx.diagnosis.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{rx.diagnosis.length - 2}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(rx.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {rx.printCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Printer className="h-3 w-3" />
                          {rx.printCount}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/prescriptions/${rx._id}`);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground self-center">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
