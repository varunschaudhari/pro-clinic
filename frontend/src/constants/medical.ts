export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'] as const;
export type BloodGroup = (typeof BLOOD_GROUPS)[number];

export const BLOOD_GROUP_OPTIONS = BLOOD_GROUPS.map((g) => ({ value: g, label: g }));

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
] as const;

export const AGE_UNIT_OPTIONS = [
  { value: 'years', label: 'Years' },
  { value: 'months', label: 'Months' },
  { value: 'days', label: 'Days' },
] as const;

export const SOURCE_OPTIONS = [
  { value: 'walkin', label: 'Walk-in' },
  { value: 'online', label: 'Online Booking' },
  { value: 'referral', label: 'Referral' },
  { value: 'camp', label: 'Camp / Drive' },
] as const;

export const COMMON_ALLERGIES = [
  'Penicillin', 'Aspirin', 'Ibuprofen', 'Sulfa drugs', 'Codeine',
  'Latex', 'Peanuts', 'Shellfish', 'Dust mites', 'Pollen',
  'Nickel', 'Contrast dye', 'Egg', 'Milk', 'Soy',
] as const;

export const COMMON_CONDITIONS = [
  'Hypertension', 'Type 2 Diabetes', 'Type 1 Diabetes', 'Hypothyroidism',
  'Hyperthyroidism', 'Asthma', 'COPD', 'Coronary Artery Disease', 'Heart Failure',
  'Chronic Kidney Disease', 'Liver Cirrhosis', 'Epilepsy', 'Depression',
  'Anxiety Disorder', 'Rheumatoid Arthritis', 'Osteoarthritis', 'Osteoporosis',
  'Anemia', 'Sickle Cell Disease', 'Thalassemia', 'PCOD/PCOS',
  'Tuberculosis (history)', 'Hepatitis B', 'Hepatitis C', 'HIV',
] as const;

export const RELATION_OPTIONS = [
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Father', label: 'Father' },
  { value: 'Mother', label: 'Mother' },
  { value: 'Son', label: 'Son' },
  { value: 'Daughter', label: 'Daughter' },
  { value: 'Brother', label: 'Brother' },
  { value: 'Sister', label: 'Sister' },
  { value: 'Guardian', label: 'Guardian' },
  { value: 'Friend', label: 'Friend' },
  { value: 'Other', label: 'Other' },
] as const;
