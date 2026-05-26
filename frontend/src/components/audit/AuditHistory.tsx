import { useEffect, useState } from 'react';
import { Clock, PlusCircle, PencilLine, Trash2, ShieldAlert } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { cn, getErrorMessage } from '@/lib/utils';
import { auditApi } from '@/services/audit.service';
import type { AuditLogItem, AuditAction } from '@/services/audit.service';

// ── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_CFG: Record<AuditAction, { icon: React.ElementType; badge: string; label: string }> = {
  CREATE: { icon: PlusCircle,  badge: 'bg-green-50 text-green-700 border-green-200',  label: 'Created' },
  UPDATE: { icon: PencilLine,  badge: 'bg-blue-50 text-blue-700 border-blue-200',     label: 'Updated' },
  DELETE: { icon: Trash2,      badge: 'bg-red-50 text-red-700 border-red-200',        label: 'Deleted' },
};

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

interface AuditHistoryProps {
  entity:   string;
  entityId: string;
}

export function AuditHistory({ entity, entityId }: AuditHistoryProps) {
  const [logs, setLogs]       = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    setLoading(true);
    auditApi.getEntityHistory(entity, entityId)
      .then((res) => setLogs(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [entity, entityId]);

  if (loading) {
    return <div className="flex justify-center py-10"><Spinner /></div>;
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>;
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm font-semibold text-foreground">No audit history</p>
        <p className="text-xs text-muted-foreground mt-1">Changes to this record will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground mb-3">{logs.length} event{logs.length !== 1 ? 's' : ''} recorded</p>
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

        <div className="space-y-3">
          {logs.map((log) => {
            const cfg = ACTION_CFG[log.action] ?? ACTION_CFG.UPDATE;
            const Icon = cfg.icon;
            return (
              <div key={log._id} className="flex gap-4 relative">
                {/* Icon dot */}
                <div className={cn(
                  'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-white shadow-sm',
                  cfg.badge
                )}>
                  <Icon className="h-3.5 w-3.5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-1">
                    <div>
                      <p className="text-sm text-foreground">{log.summary}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className={cn(
                          'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                          cfg.badge
                        )}>
                          {cfg.label}
                        </span>
                        {log.performedBy ? (
                          <span className="text-xs text-muted-foreground">
                            {log.performedBy.name}
                            <span className="ml-1 text-muted-foreground/60">({log.performedByRole})</span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">{log.performedByRole}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap shrink-0">
                      <Clock className="h-3 w-3" />
                      {formatTs(log.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
