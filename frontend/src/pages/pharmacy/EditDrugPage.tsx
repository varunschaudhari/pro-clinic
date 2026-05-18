import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { DrugForm } from '@/features/pharmacy/components/DrugForm';
import type { DrugFormValues } from '@/features/pharmacy/components/DrugForm';
import { pharmacyApi } from '@/services/pharmacy.service';
import type { DrugDoc, CreateDrugPayload, UpdateDrugPayload } from '@/services/pharmacy.service';
import { getErrorMessage } from '@/lib/utils';

const drugToFormValues = (d: DrugDoc): Partial<DrugFormValues> => ({
  name:                 d.name,
  genericName:          d.genericName    ?? '',
  brand:                d.brand          ?? '',
  manufacturer:         d.manufacturer   ?? '',
  category:             d.category,
  unit:                 d.unit as DrugFormValues['unit'],
  packSize:             d.packSize        ?? '',
  sellingPrice:         d.sellingPrice,
  mrp:                  d.mrp,
  purchasePrice:        d.purchasePrice,
  hsnCode:              d.hsnCode         ?? '',
  gstRate:              d.gstRate,
  schedule:             (d.schedule ?? '') as DrugFormValues['schedule'],
  requiresPrescription: d.requiresPrescription,
  reorderLevel:         d.reorderLevel,
  maxStock:             d.maxStock        ?? '',
  location:             d.location        ?? '',
  notes:                d.notes           ?? '',
});

export default function EditDrugPage() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [drug, setDrug]       = useState<DrugDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [submitting, setSub]  = useState(false);
  const [submitErr, setSubErr] = useState('');

  useEffect(() => {
    pharmacyApi.get(id!)
      .then((res) => setDrug(res.data.data))
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (payload: CreateDrugPayload | UpdateDrugPayload) => {
    setSub(true);
    setSubErr('');
    try {
      await pharmacyApi.update(id!, payload as UpdateDrugPayload);
      navigate(`/pharmacy/${id}`, { replace: true });
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
          <h1 className="text-xl font-semibold text-foreground">Edit Drug</h1>
          {drug && <p className="text-xs text-muted-foreground mt-0.5">{drug.name}</p>}
        </div>
      </div>

      {submitErr && <Alert variant="error">{submitErr}</Alert>}

      {drug && (
        <DrugForm
          defaultValues={drugToFormValues(drug)}
          onSubmit={handleSubmit}
          isEdit
          isSubmitting={submitting}
          onCancel={() => navigate(-1)}
        />
      )}
    </div>
  );
}
