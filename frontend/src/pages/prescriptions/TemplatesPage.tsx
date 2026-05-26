import { useEffect, useState } from 'react';
import { BookTemplate, Pencil, Search, Trash2, Users, User } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { Dialog } from '@/components/ui/Dialog';
import { Label } from '@/components/ui/Label';
import { templateApi } from '@/services/prescriptionTemplate.service';
import type { PrescriptionTemplateDoc } from '@/services/prescriptionTemplate.service';
import { getErrorMessage } from '@/lib/utils';
import { useAppSelector } from '@/app/hooks';

// ── Inline edit modal ─────────────────────────────────────────────────────────

interface EditModalProps {
  template: PrescriptionTemplateDoc;
  isClinicAdmin: boolean;
  onClose: () => void;
  onSaved: (updated: PrescriptionTemplateDoc) => void;
}

const EditModal = ({ template, isClinicAdmin, onClose, onSaved }: EditModalProps) => {
  const [name, setName]     = useState(template.name);
  const [scope, setScope]   = useState<'doctor' | 'clinic'>(template.scope);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await templateApi.update(template._id, { name: name.trim(), scope });
      onSaved(res.data.data);
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={onClose} title="Edit Template" size="sm">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label required>Template Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>

        {isClinicAdmin && (
          <div className="space-y-1.5">
            <Label>Visibility</Label>
            <div className="flex gap-3">
              {(['doctor', 'clinic'] as const).map((s) => (
                <label
                  key={s}
                  className={`flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 text-sm flex-1 transition-colors ${
                    scope === s
                      ? 'border-primary bg-primary/5 text-primary font-medium'
                      : 'border-border text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    value={s}
                    checked={scope === s}
                    onChange={() => setScope(s)}
                  />
                  {s === 'doctor' ? 'Only me' : 'All doctors (clinic)'}
                </label>
              ))}
            </div>
          </div>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" isLoading={saving} onClick={handleSave}>Save</Button>
        </div>
      </div>
    </Dialog>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const user         = useAppSelector((s) => s.auth.user);
  const isClinicAdmin = user?.role === 'ClinicAdmin';

  const [templates, setTemplates] = useState<PrescriptionTemplateDoc[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [q, setQ]                 = useState('');

  const [editing, setEditing]     = useState<PrescriptionTemplateDoc | null>(null);
  const [deleting, setDeleting]   = useState<PrescriptionTemplateDoc | null>(null);
  const [deleteErr, setDeleteErr] = useState('');
  const [confirming, setConfirming] = useState(false);

  const load = () => {
    setLoading(true);
    templateApi.list()
      .then((r) => setTemplates(r.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(q.toLowerCase())
  );

  const handleDeleted = async () => {
    if (!deleting) return;
    setConfirming(true);
    setDeleteErr('');
    try {
      await templateApi.delete(deleting._id);
      setTemplates((prev) => prev.filter((t) => t._id !== deleting._id));
      setDeleting(null);
    } catch (e) {
      setDeleteErr(getErrorMessage(e));
    } finally {
      setConfirming(false);
    }
  };

  const creatorName = (t: PrescriptionTemplateDoc) =>
    typeof t.createdBy === 'object' ? t.createdBy.name : '';

  const canEdit = (t: PrescriptionTemplateDoc) => {
    if (isClinicAdmin) return true;
    return typeof t.createdBy === 'object'
      ? t.createdBy._id === user?.id
      : t.createdBy === user?.id;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Prescription Templates</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reusable medicine sets for quick prescription drafting
          </p>
        </div>
      </div>

      {/* Search */}
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search templates..."
        leftElement={<Search className="h-4 w-4" />}
      />

      {error && <Alert variant="error">{error}</Alert>}

      {loading && (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <BookTemplate className="h-10 w-10 mb-3 opacity-20" />
          <p className="text-sm font-medium">
            {q ? 'No templates match your search.' : 'No templates yet.'}
          </p>
          {!q && (
            <p className="text-xs mt-1">
              Use "Save as Template" from the prescription form to create your first one.
            </p>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden bg-white divide-y divide-border">
          {filtered.map((t) => (
            <div key={t._id} className="flex items-center gap-4 px-4 py-3 hover:bg-accent/30 transition-colors">
              {/* Scope icon */}
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                t.scope === 'clinic' ? 'bg-blue-50' : 'bg-gray-50'
              }`}>
                {t.scope === 'clinic'
                  ? <Users className="h-4 w-4 text-blue-500" />
                  : <User className="h-4 w-4 text-gray-500" />}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                    t.scope === 'clinic'
                      ? 'bg-blue-50 text-blue-700 border-blue-100'
                      : 'bg-gray-50 text-gray-600 border-gray-100'
                  }`}>
                    {t.scope === 'clinic' ? 'Clinic' : 'Mine'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t.medicines.length} medicine{t.medicines.length !== 1 ? 's' : ''}
                  {t.medicines.map((m) => m.name).slice(0, 3).join(', ')
                    ? ` · ${t.medicines.map((m) => m.name).slice(0, 3).join(', ')}${t.medicines.length > 3 ? '…' : ''}`
                    : ''}
                  {t.scope === 'clinic' && creatorName(t) ? ` · by ${creatorName(t)}` : ''}
                </p>
              </div>

              {/* Actions */}
              {canEdit(t) && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditing(t)}
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { setDeleting(t); setDeleteErr(''); }}
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <EditModal
          template={editing}
          isClinicAdmin={isClinicAdmin}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setTemplates((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
          }}
        />
      )}

      {/* Delete confirm dialog */}
      <Dialog
        open={!!deleting}
        onClose={() => { setDeleting(null); setDeleteErr(''); }}
        title="Delete Template"
        size="sm"
      >
        <p className="text-sm text-muted-foreground">
          Permanently delete <strong>{deleting?.name}</strong>? This cannot be undone.
        </p>
        {deleteErr && <Alert variant="error" className="mt-2">{deleteErr}</Alert>}
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={() => setDeleting(null)} disabled={confirming}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" isLoading={confirming} onClick={handleDeleted}>
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
