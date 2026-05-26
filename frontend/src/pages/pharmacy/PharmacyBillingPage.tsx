import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2, Receipt, Package, AlertCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { useAppSelector } from '@/app/hooks';
import { getErrorMessage } from '@/lib/utils';
import api from '@/lib/axios';
import type { ApiResponse } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface RxMedicine {
  medicineId?: string;
  name:        string;
  dosage:      string;
  frequency:   string;
  duration:    string;
  unit:        string;
  quantity?:   number;
}

interface RxLookup {
  _id:                string;
  prescriptionNumber: string;
  diagnosis:          string[];
  medicines:          RxMedicine[];
  patientId: {
    _id:       string;
    name:      string;
    patientId: string;
    age?:      number;
    ageUnit?:  string;
    gender?:   string;
    mobile?:   string;
  };
  doctorId?: { name: string; specialization?: string };
  createdAt: string;
}

interface BillItem {
  id:          string;
  description: string;
  drugId?:     string;
  quantity:    number;
  unitPrice:   number;
  discount:    number;
  gstRate:     number;
  hsnCode?:    string;
  fromRx:      boolean;
}

const GST_OPTIONS = [0, 5, 12, 18, 28];

function genId() { return Math.random().toString(36).slice(2); }

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeItem(item: BillItem, isInterState: boolean) {
  const taxable = parseFloat(((item.unitPrice * item.quantity) - item.discount).toFixed(2));
  const gst     = parseFloat((taxable * item.gstRate / 100).toFixed(2));
  const cgst    = isInterState ? 0 : parseFloat((gst / 2).toFixed(2));
  const sgst    = isInterState ? 0 : parseFloat((gst / 2).toFixed(2));
  const igst    = isInterState ? gst : 0;
  return { taxable, cgst, sgst, igst, total: parseFloat((taxable + cgst + sgst + igst).toFixed(2)) };
}

function calcTotals(items: BillItem[], isInterState: boolean) {
  const rows = items.map((it) => computeItem(it, isInterState));
  const subtotal  = parseFloat(items.reduce((s, it) => s + it.unitPrice * it.quantity, 0).toFixed(2));
  const discount  = parseFloat(items.reduce((s, it) => s + it.discount, 0).toFixed(2));
  const taxable   = parseFloat(rows.reduce((s, r) => s + r.taxable, 0).toFixed(2));
  const cgst      = parseFloat(rows.reduce((s, r) => s + r.cgst, 0).toFixed(2));
  const sgst      = parseFloat(rows.reduce((s, r) => s + r.sgst, 0).toFixed(2));
  const igst      = parseFloat(rows.reduce((s, r) => s + r.igst, 0).toFixed(2));
  const rawTotal  = taxable + cgst + sgst + igst;
  const total     = Math.round(rawTotal);
  const roundOff  = parseFloat((total - rawTotal).toFixed(2));
  return { subtotal, discount, taxable, cgst, sgst, igst, roundOff, total };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PharmacyBillingPage() {
  const navigate     = useNavigate();
  const clinicState  = useAppSelector((s) => s.clinic.clinic);

  // Prescription lookup
  const [rxNumber, setRxNumber]   = useState('');
  const [rxLoading, setRxLoading] = useState(false);
  const [rxError, setRxError]     = useState('');
  const [rx, setRx]               = useState<RxLookup | null>(null);

  // Bill items
  const [items, setItems]           = useState<BillItem[]>([]);
  const [isInterState, setInterState] = useState(false);

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  // ── Prescription lookup ───────────────────────────────────────────────────

  const lookupRx = async () => {
    const num = rxNumber.trim().toUpperCase();
    if (!num) return;
    setRxLoading(true);
    setRxError('');
    try {
      const res = await api.get<ApiResponse<RxLookup>>(`/prescriptions/lookup?number=${encodeURIComponent(num)}`);
      const data = res.data.data;
      setRx(data);

      // Pre-fill items from prescription medicines
      const rxItems: BillItem[] = data.medicines.map((m) => ({
        id:          genId(),
        description: m.name + (m.dosage ? ` ${m.dosage}` : '') + (m.unit ? ` (${m.unit})` : ''),
        drugId:      m.medicineId,
        quantity:    m.quantity ?? 1,
        unitPrice:   0,
        discount:    0,
        gstRate:     12,
        fromRx:      true,
      }));
      setItems(rxItems);
    } catch (e) {
      setRxError(getErrorMessage(e));
      setRx(null);
      setItems([]);
    } finally {
      setRxLoading(false);
    }
  };

  const clearRx = () => {
    setRx(null);
    setRxNumber('');
    setRxError('');
    setItems([]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ── Item management ───────────────────────────────────────────────────────

  const addOtcItem = () => {
    setItems((prev) => [...prev, {
      id:          genId(),
      description: '',
      quantity:    1,
      unitPrice:   0,
      discount:    0,
      gstRate:     12,
      fromRx:      false,
    }]);
  };

  const updateItem = (id: string, field: keyof BillItem, value: string | number | boolean) => {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, [field]: value } : it));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!rx) { setSubmitError('Load a prescription first'); return; }
    if (items.length === 0) { setSubmitError('Add at least one item'); return; }
    const invalid = items.find((it) => !it.description.trim() || it.unitPrice < 0 || it.quantity <= 0);
    if (invalid) { setSubmitError('All items must have a description, quantity > 0, and unit price ≥ 0'); return; }

    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        patientId:   rx.patientId._id,
        category:    'pharmacy',
        isInterState,
        clinicGstin: clinicState?.pharmacyGstin,
        items: items.map((it) => ({
          type:        'medicine',
          description: it.description,
          hsnCode:     it.hsnCode,
          referenceId: it.drugId,
          quantity:    it.quantity,
          unitPrice:   it.unitPrice,
          discount:    it.discount,
          gstRate:     it.gstRate,
        })),
      };

      const res = await api.post<ApiResponse<{ _id: string }>>('/invoices', payload);
      navigate(`/billing/${res.data.data._id}`);
    } catch (e) {
      setSubmitError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const totals = calcTotals(items, isInterState);
  const hasItems = items.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Dispense & Bill</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Look up a prescription, confirm quantities, add OTC items, then create the invoice.
        </p>
      </div>

      {/* ── Prescription lookup ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Prescription Lookup</h2>

        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Enter prescription number  e.g. RX-2025-0001"
            value={rxNumber}
            onChange={(e) => setRxNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lookupRx()}
            className="flex-1"
            disabled={!!rx}
          />
          {rx ? (
            <Button variant="outline" onClick={clearRx}>Clear</Button>
          ) : (
            <Button onClick={lookupRx} isLoading={rxLoading} leftIcon={<Search className="h-4 w-4" />}>
              Lookup
            </Button>
          )}
        </div>

        {rxError && <Alert variant="error">{rxError}</Alert>}

        {rx && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex flex-wrap items-center gap-x-5 gap-y-1">
            <div>
              <p className="text-xs text-muted-foreground">Patient</p>
              <p className="text-sm font-semibold text-foreground">{rx.patientId.name}</p>
              <p className="text-xs text-muted-foreground">{rx.patientId.patientId} · {rx.patientId.gender} {rx.patientId.age ? `· ${rx.patientId.age} ${rx.patientId.ageUnit ?? 'yrs'}` : ''}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Prescription</p>
              <p className="text-sm font-semibold text-foreground">{rx.prescriptionNumber}</p>
              {rx.diagnosis.length > 0 && (
                <p className="text-xs text-muted-foreground truncate max-w-[220px]">{rx.diagnosis.join(' · ')}</p>
              )}
            </div>
            {rx.doctorId && (
              <div>
                <p className="text-xs text-muted-foreground">Doctor</p>
                <p className="text-sm font-medium text-foreground">Dr. {rx.doctorId.name}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Items ──────────────────────────────────────────────────────── */}
      {rx && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Bill Items
              {items.length > 0 && <span className="ml-1.5 text-xs font-normal text-muted-foreground">({items.length})</span>}
            </h2>
            <Button size="sm" variant="outline" onClick={addOtcItem} leftIcon={<Plus className="h-3.5 w-3.5" />}>
              Add OTC Item
            </Button>
          </div>

          {items.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
              No items. Add OTC items or the prescription has no medicines.
            </div>
          )}

          {items.length > 0 && (
            <div className="space-y-2">
              {/* Header row */}
              <div className="grid grid-cols-[1fr_70px_90px_70px_65px_32px] gap-2 px-1 text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                <span>Description</span>
                <span>Qty</span>
                <span>Unit Price</span>
                <span>Discount</span>
                <span>GST %</span>
                <span />
              </div>

              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_70px_90px_70px_65px_32px] gap-2 items-center">
                  <Input
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    placeholder="Medicine / item name"
                    className="text-sm"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 1)}
                    className="text-sm text-right"
                  />
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="text-sm text-right"
                  />
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={item.discount}
                    onChange={(e) => updateItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                    className="text-sm text-right"
                  />
                  <select
                    value={item.gstRate}
                    onChange={(e) => updateItem(item.id, 'gstRate', parseInt(e.target.value))}
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {GST_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r}%</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Inter-state toggle */}
          <div className="flex items-center gap-2 pt-1">
            <input
              id="inter-state"
              type="checkbox"
              checked={isInterState}
              onChange={(e) => setInterState(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="inter-state" className="text-sm cursor-pointer">
              Inter-state transaction (IGST applies)
            </Label>
          </div>
        </div>
      )}

      {/* ── Bill summary ────────────────────────────────────────────────── */}
      {rx && hasItems && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground mb-3">Summary</h2>

          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>₹{totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span>- ₹{totals.discount.toFixed(2)}</span>
              </div>
            )}
            {!isInterState && (totals.cgst > 0 || totals.sgst > 0) && (
              <>
                <div className="flex justify-between text-muted-foreground">
                  <span>CGST</span>
                  <span>₹{totals.cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>SGST</span>
                  <span>₹{totals.sgst.toFixed(2)}</span>
                </div>
              </>
            )}
            {isInterState && totals.igst > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>IGST</span>
                <span>₹{totals.igst.toFixed(2)}</span>
              </div>
            )}
            {totals.roundOff !== 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Round off</span>
                <span>{totals.roundOff > 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-foreground text-base border-t border-border pt-2 mt-2">
              <span>Total</span>
              <span>₹{totals.total.toFixed(2)}</span>
            </div>
          </div>

          {clinicState?.pharmacyGstin && (
            <p className="text-xs text-muted-foreground mt-3">
              Pharmacy GSTIN: {clinicState.pharmacyGstin}
            </p>
          )}
        </div>
      )}

      {/* ── Error + action ───────────────────────────────────────────────── */}
      {submitError && <Alert variant="error">{submitError}</Alert>}

      {!rx && !rxLoading && (
        <div className="text-center py-10 text-muted-foreground">
          <AlertCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Enter a prescription number above to begin.</p>
        </div>
      )}

      {rx && (
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('/billing')}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            isLoading={submitting}
            disabled={!hasItems}
            leftIcon={<Receipt className="h-4 w-4" />}
          >
            Create Pharmacy Invoice
            {hasItems && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      )}
    </div>
  );
}
