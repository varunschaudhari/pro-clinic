import { useEffect, useState, useCallback } from 'react';
import { ShieldAlert, Filter, ChevronLeft, ChevronRight, PlusCircle, PencilLine, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { cn, getErrorMessage } from '@/lib/utils';
import { auditApi } from '@/services/audit.service';
import type { AuditLogItem, AuditAction, ListAuditParams } from '@/services/audit.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ACTION_CFG: Record<AuditAction, { badge: string; label: string; icon: React.ElementType }> = {
  CREATE: { badge: 'bg-green-50 text-green-700 border-green-200', label: 'Created', icon: PlusCircle },
  UPDATE: { badge: 'bg-blue-50 text-blue-700 border-blue-200',    label: 'Updated', icon: PencilLine },
  DELETE: { badge: 'bg-red-50 text-red-700 border-red-200',       label: 'Deleted', icon: Trash2     },
};

const ENTITIES = ['Patient', 'Appointment', 'Prescription', 'Invoice', 'LabReport', 'Drug', 'Staff', 'Settings'];

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const [logs, setLogs]           = useState<AuditLogItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]         = useState(0);
  const LIMIT = 30;

  // Filters
  const [entity,    setEntity]    = useState('');
  const [action,    setAction]    = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate,   setEndDate]   = useState('');

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    const params: ListAuditParams = { page: p, limit: LIMIT };
    if (entity)    params.entity    = entity;
    if (action)    params.action    = action as AuditAction;
    if (startDate) params.startDate = startDate;
    if (endDate)   params.endDate   = endDate;

    try {
      const res = await auditApi.list(params);
      setLogs(res.data.data);
      setTotal(res.data.pagination.total);
      setTotalPages(res.data.pagination.totalPages ?? Math.ceil(res.data.pagination.total / LIMIT));
      setPage(p);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [entity, action, startDate, endDate]);

  useEffect(() => { load(1); }, [load]);

  const hasFilters = entity || action || startDate || endDate;

  const clearFilters = () => {
    setEntity('');
    setAction('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Audit Log
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Who did what and when — medical compliance trail
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {total > 0 && `${total} event${total !== 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap items-end gap-3">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0 mt-auto mb-1.5" />

          {/* Entity */}
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-xs text-muted-foreground font-medium">Entity</label>
            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Entities</option>
              {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          {/* Action */}
          <div className="flex flex-col gap-1 min-w-[130px]">
            <label className="text-xs text-muted-foreground font-medium">Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Actions</option>
              <option value="CREATE">Created</option>
              <option value="UPDATE">Updated</option>
              <option value="DELETE">Deleted</option>
            </select>
          </div>

          {/* Date range */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 text-muted-foreground gap-1"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShieldAlert className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-semibold text-foreground">No audit events found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {hasFilters ? 'Try clearing the filters.' : 'Audit events will appear here as the team makes changes.'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Entity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Summary</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Performed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => {
                    const cfg = ACTION_CFG[log.action] ?? ACTION_CFG.UPDATE;
                    const Icon = cfg.icon;
                    return (
                      <tr key={log._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatTs(log.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                            cfg.badge
                          )}>
                            <Icon className="h-3 w-3" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">
                            {log.entity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground max-w-xs">
                          <div className="truncate">{log.summary}</div>
                          {log.entityLabel && log.entityLabel !== log.entityId && (
                            <div className="text-xs text-muted-foreground truncate">{log.entityLabel}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {log.performedBy ? (
                            <div>
                              <p className="text-sm font-medium text-foreground">{log.performedBy.name}</p>
                              <p className="text-xs text-muted-foreground">{log.performedByRole}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">{log.performedByRole}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => load(page - 1)}
                    disabled={page <= 1}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => load(page + 1)}
                    disabled={page >= totalPages}
                    className="h-7 w-7 p-0"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
