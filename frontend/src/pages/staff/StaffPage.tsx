import { useEffect, useState, useCallback, useRef } from 'react';
import {
  UserPlus, Search, MoreVertical, CheckCircle2, XCircle,
  Clock, RefreshCcw, Users, Stethoscope, ClipboardList, Pill,
  ShieldCheck, Edit2, Trash2, Mail, ToggleLeft, ToggleRight,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Dialog } from '@/components/ui/Dialog';
import { InviteUserModal } from '@/features/auth/components/InviteUserModal';
import { EditStaffModal } from '@/features/staff/EditStaffModal';

import { usersApi } from '@/services/auth.service';
import type { StaffMember } from '@/services/auth.service';
import { cn, getInitials, getErrorMessage } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────────────────────

type RoleFilter = 'all' | 'Doctor' | 'Receptionist' | 'Pharmacist' | 'ClinicAdmin';

const ROLE_TABS: { id: RoleFilter; label: string; icon: React.ElementType }[] = [
  { id: 'all',          label: 'All',          icon: Users },
  { id: 'Doctor',       label: 'Doctors',      icon: Stethoscope },
  { id: 'Receptionist', label: 'Receptionist', icon: ClipboardList },
  { id: 'Pharmacist',   label: 'Pharmacist',   icon: Pill },
  { id: 'ClinicAdmin',  label: 'Admin',        icon: ShieldCheck },
];

const ROLE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  ClinicAdmin:  { bg: 'bg-violet-100', text: 'text-violet-700', label: 'Admin' },
  Doctor:       { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Doctor' },
  Receptionist: { bg: 'bg-amber-100',  text: 'text-amber-700',  label: 'Receptionist' },
  Pharmacist:   { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Pharmacist' },
};

const AVATAR_RING: Record<string, string> = {
  ClinicAdmin:  'ring-violet-300 bg-violet-50 text-violet-700',
  Doctor:       'ring-blue-300   bg-blue-50   text-blue-700',
  Receptionist: 'ring-amber-300  bg-amber-50  text-amber-700',
  Pharmacist:   'ring-green-300  bg-green-50  text-green-700',
};

// ── Action menu (click-outside aware) ────────────────────────────────────────

interface ActionMenuProps {
  member:          StaffMember;
  onEdit:          () => void;
  onToggleActive:  () => void;
  onResendInvite:  () => void;
  onRemove:        () => void;
  loading:         boolean;
}

function ActionMenu({ member, onEdit, onToggleActive, onResendInvite, onRemove, loading }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const action = (fn: () => void) => { setOpen(false); fn(); };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={loading}
        className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors disabled:opacity-50"
        aria-label="Actions"
      >
        {loading ? <Spinner size="sm" /> : <MoreVertical className="h-4 w-4" />}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-border bg-white shadow-lg py-1 text-sm">
          {member.role === 'Doctor' && (
            <button
              onClick={() => action(onEdit)}
              className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-accent transition-colors"
            >
              <Edit2 className="h-3.5 w-3.5 text-muted-foreground" /> Edit Profile
            </button>
          )}

          <button
            onClick={() => action(onToggleActive)}
            className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-accent transition-colors"
          >
            {member.isActive
              ? <><ToggleLeft  className="h-3.5 w-3.5 text-muted-foreground" /> Deactivate</>
              : <><ToggleRight className="h-3.5 w-3.5 text-muted-foreground" /> Activate</>
            }
          </button>

          {!member.isInviteAccepted && (
            <button
              onClick={() => action(onResendInvite)}
              className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-accent transition-colors"
            >
              <Mail className="h-3.5 w-3.5 text-muted-foreground" /> Resend Invite Link
            </button>
          )}

          {member.role !== 'ClinicAdmin' && (
            <>
              <div className="my-1 border-t border-border/60" />
              <button
                onClick={() => action(onRemove)}
                className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-red-50 text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Invite link dialog ────────────────────────────────────────────────────────

function InviteLinkDialog({
  open, onClose, name, token,
}: { open: boolean; onClose: () => void; name: string; token: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/invite/accept?token=${token}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog open={open} onClose={onClose} title="Invite Link" size="sm"
      description={`Share this link with ${name} to activate their account.`}>
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs font-mono text-muted-foreground break-all select-all">
          {link}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
          <Button className="flex-1" onClick={handleCopy}>
            {copied ? <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Copied!</> : 'Copy Link'}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// ── Remove confirmation dialog ────────────────────────────────────────────────

function RemoveDialog({
  open, onClose, member, onConfirm, loading,
}: { open: boolean; onClose: () => void; member: StaffMember | null; onConfirm: () => void; loading: boolean }) {
  if (!member) return null;
  return (
    <Dialog open={open} onClose={onClose} title="Remove Staff Member" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Remove <span className="font-semibold text-foreground">{member.name}</span> from the clinic?
          They will lose access immediately. This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="destructive" isLoading={loading} onClick={onConfirm}>Remove</Button>
        </div>
      </div>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const [staff, setStaff]           = useState<StaffMember[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  // Filters
  const [search, setSearch]         = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null);
  const [removeTarget, setRemoveTarget] = useState<StaffMember | null>(null);
  const [inviteLink, setInviteLink] = useState<{ name: string; token: string } | null>(null);

  // Per-row loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  // Debounced search
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const fetchStaff = useCallback(async (q?: string) => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, unknown> = { limit: 100 };
      if (roleFilter !== 'all') params.role = roleFilter;
      if (q !== undefined ? q : search) params.search = q ?? search;
      if (activeFilter === 'active')   params.isActive = true;
      if (activeFilter === 'inactive') params.isActive = false;

      const res = await usersApi.listStaff(params);
      setStaff(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [roleFilter, search, activeFilter]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchStaff(val), 350);
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleToggleActive = async (member: StaffMember) => {
    setActionLoading(member._id);
    try {
      const res = await usersApi.updateStaff(member._id, { isActive: !member.isActive });
      setStaff((prev) => prev.map((s) => s._id === member._id ? res.data.data : s));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendInvite = async (member: StaffMember) => {
    setActionLoading(member._id);
    try {
      const res = await usersApi.resendInvite(member._id);
      setInviteLink({ name: member.name, token: res.data.data.inviteToken });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveConfirm = async () => {
    if (!removeTarget) return;
    setRemoveLoading(true);
    try {
      await usersApi.removeStaff(removeTarget._id);
      setStaff((prev) => prev.filter((s) => s._id !== removeTarget._id));
      setTotal((t) => t - 1);
      setRemoveTarget(null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setRemoveLoading(false);
    }
  };

  const handleEditSuccess = (updated: StaffMember) => {
    setStaff((prev) => prev.map((s) => s._id === updated._id ? updated : s));
  };

  // ── Stats ──────────────────────────────────────────────────────────────────

  const allStaff    = staff;
  const activeCount = allStaff.filter((s) => s.isActive).length;
  const pendingCount = allStaff.filter((s) => !s.isInviteAccepted).length;
  const doctorCount = allStaff.filter((s) => s.role === 'Doctor').length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Staff Management</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} team member{total !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline" size="sm"
            onClick={() => fetchStaff()}
            leftIcon={<RefreshCcw className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setInviteOpen(true)}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Invite Staff
          </Button>
        </div>
      </div>

      {error && <Alert variant="error" onClose={() => setError('')}>{error}</Alert>}

      {/* Stats chips */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Active',         value: activeCount,  color: 'bg-green-50 text-green-700 border-green-200'  },
          { label: 'Doctors',        value: doctorCount,  color: 'bg-blue-50  text-blue-700  border-blue-200'   },
          { label: 'Pending Invite', value: pendingCount, color: 'bg-amber-50 text-amber-700 border-amber-200'  },
        ].map(({ label, value, color }) => (
          <div key={label} className={cn('flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium', color)}>
            <span className="font-bold text-sm">{value}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name, mobile or email…"
            className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 shrink-0">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-md capitalize transition-colors',
                activeFilter === f ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Role tabs */}
      <div className="flex gap-1 border-b border-border">
        {ROLE_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setRoleFilter(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              roleFilter === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : staff.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex justify-center mb-3">
            <div className="h-14 w-14 rounded-full bg-primary/5 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-primary/40" />
            </div>
          </div>
          <h3 className="font-semibold text-foreground mb-1">
            {search || roleFilter !== 'all' || activeFilter !== 'all'
              ? 'No staff match your filters'
              : 'No staff members yet'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {search || roleFilter !== 'all' || activeFilter !== 'all'
              ? 'Try adjusting your search or filters.'
              : 'Invite doctors, receptionists, or pharmacists to get started.'}
          </p>
          {!search && roleFilter === 'all' && activeFilter === 'all' && (
            <Button onClick={() => setInviteOpen(true)} leftIcon={<UserPlus className="h-4 w-4" />}>
              Invite First Member
            </Button>
          )}
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-muted/20">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Member
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Role
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                    Mobile
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                    Details
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden xl:table-cell">
                    Last Login
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staff.map((member) => {
                  const rs = ROLE_STYLE[member.role] ?? { bg: 'bg-gray-100', text: 'text-gray-700', label: member.role };
                  const av = AVATAR_RING[member.role]  ?? 'ring-gray-300 bg-gray-50 text-gray-700';
                  return (
                    <tr key={member._id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Name + email */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={cn('h-9 w-9 rounded-full ring-2 flex items-center justify-center text-xs font-bold shrink-0', av)}>
                            {getInitials(member.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground truncate">{member.name}</p>
                            {member.email && (
                              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5">
                        <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', rs.bg, rs.text)}>
                          {rs.label}
                        </span>
                      </td>

                      {/* Mobile */}
                      <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell font-mono text-xs">
                        {member.mobile}
                      </td>

                      {/* Specialization / fee */}
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        {member.role === 'Doctor' ? (
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            <p>{member.specialization ?? <span className="italic">No specialization</span>}</p>
                            {member.consultationFee != null && (
                              <p className="font-medium text-foreground">₹{member.consultationFee}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        {!member.isInviteAccepted ? (
                          <Badge variant="warning">Pending Invite</Badge>
                        ) : member.isActive ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs font-medium whitespace-nowrap">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500 text-xs font-medium whitespace-nowrap">
                            <XCircle className="h-3.5 w-3.5 shrink-0" /> Inactive
                          </span>
                        )}
                      </td>

                      {/* Last login */}
                      <td className="px-4 py-3.5 text-xs text-muted-foreground hidden xl:table-cell whitespace-nowrap">
                        {member.lastLoginAt ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(member.lastLoginAt).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric',
                            })}
                          </span>
                        ) : (
                          <span className="italic">Never</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <ActionMenu
                          member={member}
                          loading={actionLoading === member._id}
                          onEdit={() => setEditTarget(member)}
                          onToggleActive={() => handleToggleActive(member)}
                          onResendInvite={() => handleResendInvite(member)}
                          onRemove={() => setRemoveTarget(member)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modals */}
      <InviteUserModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={(token) => {
          setInviteOpen(false);
          fetchStaff();
          if (token) setInviteLink(token);
        }}
      />

      {editTarget && (
        <EditStaffModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          member={editTarget}
          onSuccess={handleEditSuccess}
        />
      )}

      <RemoveDialog
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        member={removeTarget}
        onConfirm={handleRemoveConfirm}
        loading={removeLoading}
      />

      {inviteLink && (
        <InviteLinkDialog
          open={!!inviteLink}
          onClose={() => setInviteLink(null)}
          name={inviteLink.name}
          token={inviteLink.token}
        />
      )}
    </div>
  );
}
