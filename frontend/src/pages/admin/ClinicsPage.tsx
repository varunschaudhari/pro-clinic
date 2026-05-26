import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, ChevronLeft, ChevronRight, MoreVertical, Power, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { Dialog } from '@/components/ui/Dialog';
import { superadminApi } from '@/services/superadmin.service';
import type { ClinicListItem } from '@/services/superadmin.service';
import { getErrorMessage } from '@/lib/utils';

// ── Badge helpers ─────────────────────────────────────────────────────────────

const PLAN_BADGE: Record<string, string> = {
  trial:        'bg-violet-100 text-violet-700 border-violet-200',
  basic:        'bg-blue-100 text-blue-700 border-blue-200',
  professional: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  enterprise:   'bg-amber-100 text-amber-700 border-amber-200',
};

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  inactive:  'bg-gray-100 text-gray-600',
  expired:   'bg-red-100 text-red-700',
  suspended: 'bg-orange-100 text-orange-700',
};

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border capitalize ${PLAN_BADGE[plan] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {plan}
    </span>
  );
}

function StatusBadge({ clinic }: { clinic: ClinicListItem }) {
  const status = !clinic.isActive ? 'inactive' : clinic.subscription.status;
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize ${STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Row action menu ───────────────────────────────────────────────────────────

function RowMenu({ clinic, onToggle }: { clinic: ClinicListItem; onToggle: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px] rounded-md border border-border bg-white shadow-lg overflow-hidden">
          <button
            onClick={() => { setOpen(false); navigate(`/admin/clinics/${clinic._id}`); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors"
          >
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            View Details
          </button>
          <button
            onClick={() => { setOpen(false); onToggle(); }}
            className={`flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors ${
              clinic.isActive ? 'text-destructive hover:text-destructive' : 'text-emerald-600 hover:text-emerald-700'
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            {clinic.isActive ? 'Suspend' : 'Activate'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Confirm toggle dialog ─────────────────────────────────────────────────────

function ToggleDialog({
  clinic,
  onClose,
  onConfirmed,
}: {
  clinic: ClinicListItem;
  onClose: () => void;
  onConfirmed: (updated: ClinicListItem) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const action = clinic.isActive ? 'Suspend' : 'Activate';

  const confirm = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await superadminApi.toggleStatus(clinic._id);
      onConfirmed({ ...clinic, isActive: r.data.data.isActive, subscription: { ...clinic.subscription, status: r.data.data.subscriptionStatus as any } });
      toast.success(`Clinic ${r.data.data.isActive ? 'activated' : 'suspended'} successfully`);
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title={`${action} Clinic`} size="sm">
      <p className="text-sm text-muted-foreground">
        {clinic.isActive
          ? `Suspending "${clinic.name}" will prevent all its users from logging in.`
          : `Activating "${clinic.name}" will restore access for all its users.`}
      </p>
      {error && <Alert variant="error" className="mt-3">{error}</Alert>}
      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          size="sm"
          variant={clinic.isActive ? 'destructive' : 'primary'}
          isLoading={loading}
          onClick={confirm}
        >
          {action}
        </Button>
      </div>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'active',    label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'expired',   label: 'Expired' },
  { value: 'inactive',  label: 'Inactive' },
];

const PLAN_FILTER_OPTIONS = [
  { value: '',             label: 'All Plans' },
  { value: 'trial',        label: 'Trial' },
  { value: 'basic',        label: 'Basic' },
  { value: 'professional', label: 'Professional' },
  { value: 'enterprise',   label: 'Enterprise' },
];

export default function ClinicsPage() {
  const [clinics, setClinics]   = useState<ClinicListItem[]>([]);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [plan, setPlan]         = useState('');
  const [toggling, setToggling] = useState<ClinicListItem | null>(null);

  const load = (p = page) => {
    setLoading(true);
    superadminApi.listClinics({ search: search || undefined, status: status || undefined, plan: plan || undefined, page: p, limit: 20 })
      .then((r) => {
        setClinics(r.data.data.data);
        setTotal(r.data.data.total);
        setPages(r.data.data.pages);
      })
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setPage(1); load(1); }, [search, status, plan]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggled = (updated: ClinicListItem) => {
    setClinics((prev) => prev.map((c) => (c._id === updated._id ? updated : c)));
  };

  return (
    <div className="space-y-4 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Clinics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{total} clinic{total !== 1 ? 's' : ''} registered</p>
        </div>
        <Link to="/admin/clinics/new">
          <Button size="sm" leftIcon={<Plus className="h-4 w-4" />}>New Clinic</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex-1 min-w-[200px]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or city…"
            leftElement={<Search className="h-4 w-4" />}
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {STATUS_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {PLAN_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                {['Clinic', 'Type', 'City', 'Plan', 'Status', 'Expires', 'Doctors', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr><td colSpan={8} className="py-16 text-center"><Spinner /></td></tr>
              ) : clinics.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center text-muted-foreground text-sm">No clinics found</td></tr>
              ) : clinics.map((clinic) => (
                <tr key={clinic._id} className="hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/admin/clinics/${clinic._id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                      {clinic.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{clinic.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{clinic.type}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{clinic.address.city}</td>
                  <td className="px-4 py-3 whitespace-nowrap"><PlanBadge plan={clinic.subscription.plan} /></td>
                  <td className="px-4 py-3 whitespace-nowrap"><StatusBadge clinic={clinic} /></td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">{fmtDate(clinic.subscription.endDate)}</td>
                  <td className="px-4 py-3 text-muted-foreground text-center">{clinic.subscription.maxDoctors}</td>
                  <td className="px-4 py-3">
                    <RowMenu clinic={clinic} onToggle={() => setToggling(clinic)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-gray-50/50">
            <p className="text-xs text-muted-foreground">Page {page} of {pages}</p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-7 w-7 flex items-center justify-center rounded border border-border text-muted-foreground hover:bg-accent disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="h-7 w-7 flex items-center justify-center rounded border border-border text-muted-foreground hover:bg-accent disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {toggling && (
        <ToggleDialog
          clinic={toggling}
          onClose={() => setToggling(null)}
          onConfirmed={handleToggled}
        />
      )}
    </div>
  );
}
