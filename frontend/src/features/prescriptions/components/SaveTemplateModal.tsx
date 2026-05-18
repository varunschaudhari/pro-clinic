import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { templateApi } from '@/services/prescriptionTemplate.service';
import type { TemplateMedicine } from '@/services/prescriptionTemplate.service';
import { getErrorMessage } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  medicines: TemplateMedicine[];
  advice?: string;
  dietAdvice?: string;
  isClinicAdmin: boolean;
  onSaved: () => void;
}

export function SaveTemplateModal({
  open,
  onClose,
  medicines,
  advice,
  dietAdvice,
  isClinicAdmin,
  onSaved,
}: Props) {
  const [name, setName]       = useState('');
  const [scope, setScope]     = useState<'doctor' | 'clinic'>('doctor');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  const handleClose = () => {
    setName('');
    setScope('doctor');
    setError('');
    onClose();
  };

  const handleSave = async () => {
    if (!name.trim()) { setError('Template name is required'); return; }
    setSaving(true);
    setError('');
    try {
      await templateApi.create({ name: name.trim(), scope, medicines, advice, dietAdvice });
      onSaved();
      handleClose();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Save as Template" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Save the current {medicines.length} medicine{medicines.length !== 1 ? 's' : ''} as a reusable template.
        </p>

        <div className="space-y-1.5">
          <Label required>Template Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fever + Cold Standard"
            autoFocus
          />
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
          <Button variant="outline" size="sm" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" isLoading={saving} onClick={handleSave}>
            Save Template
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
