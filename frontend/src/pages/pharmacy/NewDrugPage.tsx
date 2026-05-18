import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { DrugForm } from '@/features/pharmacy/components/DrugForm';
import { pharmacyApi } from '@/services/pharmacy.service';
import type { CreateDrugPayload, UpdateDrugPayload } from '@/services/pharmacy.service';
import { getErrorMessage } from '@/lib/utils';

export default function NewDrugPage() {
  const navigate = useNavigate();
  const [submitting, setSub]  = useState(false);
  const [submitErr, setSubErr] = useState('');

  const handleSubmit = async (payload: CreateDrugPayload | UpdateDrugPayload) => {
    setSub(true);
    setSubErr('');
    try {
      const res = await pharmacyApi.create(payload as CreateDrugPayload);
      navigate(`/pharmacy/${res.data.data._id}`, { replace: true });
    } catch (e) {
      setSubErr(getErrorMessage(e));
    } finally {
      setSub(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="h-8 w-8 p-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold text-foreground">Add Drug / Item</h1>
      </div>

      {submitErr && <Alert variant="error">{submitErr}</Alert>}

      <DrugForm
        onSubmit={handleSubmit}
        isSubmitting={submitting}
        onCancel={() => navigate(-1)}
      />
    </div>
  );
}
