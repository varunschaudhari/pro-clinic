export const DRUG_CATEGORIES = [
  'medicine',
  'consumable',
  'equipment',
  'supplement',
  'other',
] as const;

export type DrugCategory = (typeof DRUG_CATEGORIES)[number];

export const DRUG_CATEGORY_CONFIG: Record<DrugCategory, { label: string; badge: string }> = {
  medicine:    { label: 'Medicine',    badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  consumable:  { label: 'Consumable',  badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  equipment:   { label: 'Equipment',   badge: 'bg-gray-50 text-gray-700 border-gray-200' },
  supplement:  { label: 'Supplement',  badge: 'bg-green-50 text-green-700 border-green-200' },
  other:       { label: 'Other',       badge: 'bg-amber-50 text-amber-700 border-amber-200' },
};

export const DRUG_UNITS = [
  'tablet', 'capsule', 'syrup', 'injection', 'cream',
  'drops', 'inhaler', 'powder', 'sachet', 'other',
] as const;

export const DRUG_SCHEDULES = ['H', 'H1', 'X', 'G', 'OTC'] as const;

export const DRUG_SCHEDULE_CONFIG: Record<string, { label: string; description: string }> = {
  H:   { label: 'Schedule H',  description: 'Prescription only' },
  H1:  { label: 'Schedule H1', description: 'Narcotic/Psychotropic' },
  X:   { label: 'Schedule X',  description: 'Habit-forming' },
  G:   { label: 'Schedule G',  description: 'Medical supervision' },
  OTC: { label: 'OTC',         description: 'Over the counter' },
};

export const STOCK_TRANSACTION_TYPE_CONFIG: Record<string, { label: string; color: string; direction: 'in' | 'out' }> = {
  purchase:   { label: 'Purchase',   color: 'text-green-600',  direction: 'in' },
  return:     { label: 'Return',     color: 'text-green-500',  direction: 'in' },
  adjustment: { label: 'Adjustment', color: 'text-blue-600',   direction: 'in' },
  dispense:   { label: 'Dispense',   color: 'text-orange-600', direction: 'out' },
  sale:       { label: 'Sale',       color: 'text-orange-500', direction: 'out' },
  expired:    { label: 'Expired',    color: 'text-red-500',    direction: 'out' },
};

export const DRUG_CATEGORY_OPTIONS = DRUG_CATEGORIES.map((c) => ({
  value: c,
  label: DRUG_CATEGORY_CONFIG[c].label,
}));

export const DRUG_UNIT_OPTIONS = DRUG_UNITS.map((u) => ({ value: u, label: u }));

export const GST_RATE_OPTIONS = [0, 5, 12, 18, 28].map((r) => ({
  value: String(r),
  label: r === 0 ? 'Exempt (0%)' : `${r}%`,
}));

export const STOCK_IN_TYPE_OPTIONS = [
  { value: 'purchase',   label: 'Purchase (from supplier)' },
  { value: 'return',     label: 'Return (from patient)' },
  { value: 'adjustment', label: 'Adjustment (correction / found stock)' },
];

export const STOCK_OUT_TYPE_OPTIONS = [
  { value: 'expired',    label: 'Expired / Destroyed' },
  { value: 'adjustment', label: 'Write-off / Shrinkage' },
];

export const TXN_TYPE_FILTER_OPTIONS = [
  { value: '',           label: 'All' },
  { value: 'purchase',   label: 'Purchase' },
  { value: 'return',     label: 'Return' },
  { value: 'adjustment', label: 'Adjustment' },
  { value: 'dispense',   label: 'Dispense' },
  { value: 'expired',    label: 'Expired' },
];
