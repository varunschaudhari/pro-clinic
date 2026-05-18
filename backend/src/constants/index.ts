export const ROLES = {
  SUPER_ADMIN: 'SuperAdmin',
  CLINIC_ADMIN: 'ClinicAdmin',
  DOCTOR: 'Doctor',
  RECEPTIONIST: 'Receptionist',
  PHARMACIST: 'Pharmacist',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const CLINIC_TYPES = ['General Medicine', 'Dental', 'Dermatology', 'Pediatrics', 'Orthopaedics', 'Gynaecology', 'ENT', 'Ophthalmology', 'Multi-Specialty'] as const;
export type ClinicType = (typeof CLINIC_TYPES)[number];

export const APPOINTMENT_STATUS = {
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;

export const VISIT_TYPES = ['new', 'followup'] as const;
export const APPOINTMENT_MODES = ['walkin', 'scheduled', 'teleconsult'] as const;

export const GENDERS = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDERS)[number];

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'] as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  REFUNDED: 'refunded',
} as const;

export const PAYMENT_MODES = ['cash', 'card', 'upi', 'netbanking', 'insurance', 'other'] as const;

export const INVOICE_ITEM_TYPES = ['consultation', 'medicine', 'lab', 'procedure', 'other'] as const;

export const SUBSCRIPTION_PLANS = {
  TRIAL: 'trial',
  BASIC: 'basic',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
} as const;

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
} as const;

export const MEDICINE_UNITS = ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'powder', 'sachet', 'other'] as const;
export const DOSAGE_FREQUENCIES = ['OD', 'BD', 'TDS', 'QID', 'SOS', 'HS', 'AC', 'PC', 'STAT'] as const;

export const GST_RATES = [0, 5, 12, 18, 28] as const;

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
] as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;
