import { useEffect, useState } from 'react';
import { Search, BookTemplate, Users, User } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { templateApi } from '@/services/prescriptionTemplate.service';
import type { PrescriptionTemplateDoc, TemplateMedicine } from '@/services/prescriptionTemplate.service';
import { getErrorMessage } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  onLoad: (medicines: TemplateMedicine[], advice?: string, dietAdvice?: string) => void;
}

export function TemplatePicker({ open, onClose, onLoad }: Props) {
  const [templates, setTemplates] = useState<PrescriptionTemplateDoc[]>([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [q, setQ]                 = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError('');
    templateApi.list()
      .then((r) => setTemplates(r.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(q.toLowerCase())
  );

  const handleLoad = (t: PrescriptionTemplateDoc) => {
    onLoad(t.medicines, t.advice, t.dietAdvice);
    onClose();
  };

  const creatorName = (t: PrescriptionTemplateDoc) =>
    typeof t.createdBy === 'object' ? t.createdBy.name : '';

  return (
    <Dialog open={open} onClose={onClose} title="Load Prescription Template" size="md">
      <div className="space-y-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search templates..."
          leftElement={<Search className="h-4 w-4" />}
        />

        {loading && (
          <div className="flex justify-center py-8"><Spinner /></div>
        )}

        {error && <Alert variant="error">{error}</Alert>}

        {!loading && !error && filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <BookTemplate className="h-8 w-8 mx-auto mb-2 opacity-30" />
            {q ? 'No templates match your search.' : 'No templates saved yet.'}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden max-h-80 overflow-y-auto">
            {filtered.map((t) => (
              <li
                key={t._id}
                className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-accent/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      t.scope === 'clinic'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'bg-gray-50 text-gray-600 border border-gray-100'
                    }`}>
                      {t.scope === 'clinic'
                        ? <><Users className="h-2.5 w-2.5" />Clinic</>
                        : <><User className="h-2.5 w-2.5" />Mine</>}
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
                <Button size="sm" variant="outline" onClick={() => handleLoad(t)}>
                  Load
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialog>
  );
}
