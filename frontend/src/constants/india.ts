export const CLINIC_TYPES = [
  'General Medicine',
  'Dental',
  'Dermatology',
  'Pediatrics',
  'Orthopaedics',
  'Gynaecology',
  'ENT',
  'Ophthalmology',
  'Multi-Specialty',
] as const;

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
  'Andaman and Nicobar Islands', 'Dadra and Nagar Haveli and Daman and Diu',
  'Lakshadweep',
] as const;

export const STAFF_ROLES = [
  { value: 'Doctor', label: 'Doctor' },
  { value: 'Receptionist', label: 'Receptionist' },
  { value: 'Pharmacist', label: 'Pharmacist' },
] as const;

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'] as const;

export const GENDERS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
] as const;

export const DOCTOR_SPECIALIZATIONS = [
  'General Medicine', 'Internal Medicine', 'Dentistry', 'Dermatology',
  'Pediatrics', 'Orthopaedics', 'Gynaecology & Obstetrics', 'ENT',
  'Ophthalmology', 'Cardiology', 'Neurology', 'Psychiatry', 'Urology',
  'Nephrology', 'Gastroenterology', 'Pulmonology', 'Endocrinology',
  'Rheumatology', 'Oncology', 'Radiology', 'Pathology', 'Anaesthesiology',
  'General Surgery', 'Plastic Surgery', 'Neurosurgery', 'Other',
] as const;
