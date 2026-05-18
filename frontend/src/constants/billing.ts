export const PAYMENT_MODES = ['cash', 'card', 'upi', 'netbanking', 'insurance', 'other'] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  cash:       'Cash',
  card:       'Card',
  upi:        'UPI',
  netbanking: 'Net Banking',
  insurance:  'Insurance',
  other:      'Other',
};

export const INVOICE_ITEM_TYPES = ['consultation', 'medicine', 'lab', 'procedure', 'other'] as const;
export type InvoiceItemType = (typeof INVOICE_ITEM_TYPES)[number];

export const ITEM_TYPE_LABELS: Record<InvoiceItemType, string> = {
  consultation: 'Consultation',
  medicine:     'Medicine',
  lab:          'Lab Test',
  procedure:    'Procedure',
  other:        'Other',
};

export const GST_RATES = [0, 5, 12, 18, 28] as const;
export type GstRate = (typeof GST_RATES)[number];

export const PAYMENT_STATUS_CONFIG = {
  pending:  { label: 'Pending',  badge: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  partial:  { label: 'Partial',  badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  paid:     { label: 'Paid',     badge: 'bg-green-50 text-green-700 border-green-200' },
  refunded: { label: 'Refunded', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
} as const;

export const PAYMENT_MODE_OPTIONS = PAYMENT_MODES.map((m) => ({
  value: m,
  label: PAYMENT_MODE_LABELS[m],
}));

export const ITEM_TYPE_OPTIONS = INVOICE_ITEM_TYPES.map((t) => ({
  value: t,
  label: ITEM_TYPE_LABELS[t],
}));

export const GST_RATE_OPTIONS = GST_RATES.map((r) => ({
  value: String(r),
  label: r === 0 ? 'Nil (0%)' : `${r}%`,
}));

// Common consultation charges for quick-fill
export const COMMON_ITEMS = [
  { description: 'Consultation Fee',      type: 'consultation' as InvoiceItemType, unitPrice: 300 },
  { description: 'Follow-up Consultation', type: 'consultation' as InvoiceItemType, unitPrice: 200 },
  { description: 'Teleconsultation',       type: 'consultation' as InvoiceItemType, unitPrice: 150 },
  { description: 'Dressing / Wound Care',  type: 'procedure'    as InvoiceItemType, unitPrice: 200 },
  { description: 'ECG',                    type: 'procedure'    as InvoiceItemType, unitPrice: 150 },
  { description: 'Injection Administration', type: 'procedure'  as InvoiceItemType, unitPrice: 100 },
  { description: 'Blood Collection',       type: 'lab'          as InvoiceItemType, unitPrice: 50  },
] as const;
