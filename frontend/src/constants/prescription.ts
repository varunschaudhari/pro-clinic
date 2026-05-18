export const DOSAGE_FREQUENCIES = ['OD', 'BD', 'TDS', 'QID', 'SOS', 'HS', 'AC', 'PC', 'STAT'] as const;
export type DosageFrequency = (typeof DOSAGE_FREQUENCIES)[number];

export const FREQ_DISPLAY: Record<string, string> = {
  OD:   'Once Daily (OD)',
  BD:   'Twice Daily (BD)',
  TDS:  'Three Times Daily (TDS)',
  QID:  'Four Times Daily (QID)',
  SOS:  'If Needed (SOS)',
  HS:   'At Bedtime (HS)',
  AC:   'Before Meals (AC)',
  PC:   'After Meals (PC)',
  STAT: 'Immediately (STAT)',
};

export const FREQ_TIMES_PER_DAY: Record<string, number> = {
  OD: 1, BD: 2, TDS: 3, QID: 4,
  SOS: 1, HS: 1, AC: 3, PC: 3, STAT: 1,
};

export const MEDICINE_UNITS = [
  'tablet', 'capsule', 'syrup', 'injection', 'cream',
  'drops', 'inhaler', 'powder', 'sachet', 'other',
] as const;

export const MEDICINE_ROUTES = [
  'oral', 'topical', 'IV', 'IM', 'SC',
  'nasal', 'ophthalmic', 'otic', 'sublingual', 'rectal',
] as const;

export const DURATION_UNITS = [
  { value: 'days',   label: 'Days' },
  { value: 'weeks',  label: 'Weeks' },
  { value: 'months', label: 'Months' },
] as const;

export const COMMON_DIAGNOSES = [
  'Acute Upper Respiratory Tract Infection (URTI)',
  'Acute Gastroenteritis',
  'Viral Fever',
  'Type 2 Diabetes Mellitus',
  'Hypertension',
  'Hypothyroidism',
  'Asthma',
  'Migraine',
  'Urinary Tract Infection (UTI)',
  'Acute Pharyngitis / Tonsillitis',
  'Malaria',
  'Dengue Fever',
  'Typhoid',
  'Anemia',
  'Low Back Pain / Backache',
  'Osteoarthritis',
  'Allergic Rhinitis',
  'Acute Bronchitis',
  'Pneumonia',
  'Peptic Ulcer Disease',
  'GERD / Acid Reflux',
  'Irritable Bowel Syndrome (IBS)',
  'Anxiety Disorder',
  'Depression',
  'Cellulitis',
  'Conjunctivitis',
  'Otitis Media',
  'Fungal Infection',
  'Acne Vulgaris',
  'Eczema / Dermatitis',
] as const;

export const COMMON_LAB_TESTS = [
  'Complete Blood Count (CBC)',
  'Blood Sugar Fasting (BSF)',
  'Blood Sugar Post-Prandial (BSPP)',
  'HbA1c',
  'Lipid Profile',
  'Liver Function Tests (LFT)',
  'Kidney Function Tests (KFT)',
  'Thyroid Function Tests (TFT) — T3, T4, TSH',
  'Urine Routine & Microscopy',
  'Urine Culture & Sensitivity',
  'ECG',
  'Chest X-Ray',
  'Echocardiography',
  'USG Abdomen & Pelvis',
  'Dengue NS1 Antigen',
  'Malaria Antigen (RDT)',
  'Widal Test',
  'Sputum AFB',
  'COVID-19 RT-PCR / Antigen',
  'Serum Uric Acid',
  'Vitamin D3',
  'Vitamin B12',
  'Serum Iron Studies',
  'Blood Culture & Sensitivity',
  'Stool Routine & Microscopy',
  'Serum Electrolytes (Na, K, Cl)',
  'Prothrombin Time (PT/INR)',
  'CRP (C-Reactive Protein)',
  'ESR',
] as const;

export const MEDICINE_INSTRUCTIONS = [
  'With food',
  'Before food',
  'After food',
  'At bedtime',
  'On empty stomach',
  'With warm water',
  'With milk',
  'Avoid alcohol',
  'Avoid driving',
  'Apply externally',
  'Dilute before use',
  'Do not chew',
  'Keep under tongue',
] as const;

export const FREQ_OPTIONS = DOSAGE_FREQUENCIES.map((f) => ({
  value: f,
  label: FREQ_DISPLAY[f] ?? f,
}));

export const UNIT_OPTIONS = MEDICINE_UNITS.map((u) => ({
  value: u,
  label: u.charAt(0).toUpperCase() + u.slice(1),
}));

export const ROUTE_OPTIONS = MEDICINE_ROUTES.map((r) => ({
  value: r,
  label: r.charAt(0).toUpperCase() + r.slice(1),
}));
