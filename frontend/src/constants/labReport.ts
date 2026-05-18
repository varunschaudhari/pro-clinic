export const LAB_STATUSES = ['ordered', 'sample_collected', 'processing', 'completed', 'cancelled'] as const;
export type LabStatus = (typeof LAB_STATUSES)[number];

export const LAB_STATUS_CONFIG: Record<LabStatus, { label: string; badge: string; dot: string; next: LabStatus[] }> = {
  ordered:          { label: 'Ordered',          badge: 'bg-gray-100 text-gray-700 border-gray-200',    dot: 'bg-gray-400',   next: ['sample_collected', 'cancelled'] },
  sample_collected: { label: 'Sample Collected', badge: 'bg-blue-50 text-blue-700 border-blue-200',    dot: 'bg-blue-400',   next: ['processing', 'cancelled'] },
  processing:       { label: 'Processing',       badge: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400',  next: ['completed', 'cancelled'] },
  completed:        { label: 'Completed',        badge: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500',  next: [] },
  cancelled:        { label: 'Cancelled',        badge: 'bg-red-50 text-red-700 border-red-200',       dot: 'bg-red-400',    next: [] },
};

export const TEST_CATEGORIES = [
  'Haematology',
  'Biochemistry',
  'Microbiology',
  'Serology / Immunology',
  'Radiology',
  'Histopathology',
  'Cytology',
  'Urine Analysis',
  'Stool Analysis',
  'Hormones / Endocrinology',
  'Other',
] as const;

export const SAMPLE_TYPES = [
  'Blood (Venous)',
  'Blood (Capillary)',
  'Urine (Random)',
  'Urine (Spot)',
  'Urine (24-hour)',
  'Stool',
  'Throat Swab',
  'Nasal Swab',
  'Sputum',
  'CSF',
  'Pus / Wound Swab',
  'Tissue Biopsy',
  'Other',
] as const;

export const FLAG_CONFIG: Record<string, { label: string; color: string }> = {
  H:  { label: 'High',          color: 'text-orange-600' },
  L:  { label: 'Low',           color: 'text-blue-600' },
  HH: { label: 'Critical High', color: 'text-red-600 font-bold' },
  LL: { label: 'Critical Low',  color: 'text-red-600 font-bold' },
  A:  { label: 'Abnormal',      color: 'text-yellow-700' },
};

export const TEST_CATEGORY_OPTIONS = TEST_CATEGORIES.map((c) => ({ value: c, label: c }));
export const SAMPLE_TYPE_OPTIONS   = SAMPLE_TYPES.map((s) => ({ value: s, label: s }));
export const FLAG_OPTIONS = [
  { value: '',   label: '— Normal —' },
  { value: 'H',  label: 'H — High' },
  { value: 'L',  label: 'L — Low' },
  { value: 'HH', label: 'HH — Critical High' },
  { value: 'LL', label: 'LL — Critical Low' },
  { value: 'A',  label: 'A — Abnormal' },
];

export const STATUS_ACTION_LABELS: Record<LabStatus, string> = {
  ordered:          'Mark Ordered',
  sample_collected: 'Mark Sample Collected',
  processing:       'Mark Processing',
  completed:        'Mark Completed',
  cancelled:        'Cancel',
};
