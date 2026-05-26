import { z } from 'zod';
import { GENDERS, BLOOD_GROUPS, INDIAN_STATES } from '../../constants';

const mobileSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number');

const optionalMobile = mobileSchema.optional().or(z.literal(''));
const optionalEmail = z.string().trim().email('Invalid email').optional().or(z.literal(''));

// ── Create / Update ───────────────────────────────────────────────────────────
export const createPatientSchema = z.object({
  // Required
  name: z.string().trim().min(2, 'Minimum 2 characters').max(100),
  mobile: mobileSchema,
  gender: z.enum(GENDERS),

  // Identity
  alternateMobile: optionalMobile,
  email: optionalEmail,

  // Age — either DOB or (age + ageUnit)
  dob: z.string().optional(), // ISO 8601 date
  age: z.coerce.number().min(0).max(150).optional(),
  ageUnit: z.enum(['years', 'months', 'days']).default('years'),

  bloodGroup: z.enum(BLOOD_GROUPS).optional(),
  height: z.coerce.number().min(0).max(300).optional(),
  weight: z.coerce.number().min(0).max(500).optional(),

  // Address (all optional — clinic can skip for walk-ins)
  addressLine1: z.string().trim().max(200).optional(),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.enum(INDIAN_STATES).optional(),
  pincode: z.string().regex(/^\d{6}$/, 'Must be 6 digits').optional().or(z.literal('')),

  // Emergency contact
  emergencyName: z.string().trim().max(100).optional(),
  emergencyMobile: optionalMobile,
  emergencyRelation: z.string().trim().max(50).optional(),

  // Medical background
  allergies: z.array(z.string().trim()).default([]),
  chronicConditions: z.array(z.string().trim()).default([]),
  currentMedications: z.array(z.string().trim()).default([]),

  // Insurance
  insuranceProvider: z.string().trim().optional(),
  insurancePolicyNumber: z.string().trim().optional(),
  insuranceValidTill: z.string().optional(), // ISO date

  // India-specific
  aadharLast4: z.string().regex(/^\d{4}$/, 'Enter last 4 digits only').optional().or(z.literal('')),
  abhaId: z.string().trim().optional(),

  source:    z.enum(['walkin', 'online', 'referral', 'camp']).default('walkin'),
  notes:     z.string().trim().max(1000).optional(),
  smsOptIn:  z.boolean().default(true),
});

export const updatePatientSchema = createPatientSchema.partial().extend({
  // These are required on create but can't be changed after creation
  mobile: mobileSchema.optional(),
});

export const listPatientsSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  gender: z.enum(GENDERS).optional(),
  bloodGroup: z.enum(BLOOD_GROUPS).optional(),
  sortBy: z.enum(['name', 'createdAt', 'lastVisitDate', 'visitCount']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type ListPatientsInput = z.infer<typeof listPatientsSchema>;
