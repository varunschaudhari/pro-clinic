import { z } from 'zod';

const INDIAN_MOBILE = /^[6-9]\d{9}$/;
const PINCODE       = /^\d{6}$/;
const GSTIN_RE      = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/;

export const updateClinicSchema = z.object({
  // Identity
  name:               z.string().trim().min(1).max(100).optional(),
  type:               z.enum([
    'General Medicine', 'Dental', 'Dermatology', 'Pediatrics', 'Orthopaedics',
    'Gynaecology', 'ENT', 'Ophthalmology', 'Multi-Specialty',
  ]).optional(),
  registrationNumber: z.string().trim().max(50).optional().or(z.literal('')),
  gstin:              z.string().trim().toUpperCase()
                        .refine((v) => !v || GSTIN_RE.test(v), 'Invalid GSTIN format')
                        .optional().or(z.literal('')),
  pharmacyGstin:      z.string().trim().toUpperCase()
                        .refine((v) => !v || GSTIN_RE.test(v), 'Invalid GSTIN format')
                        .optional().or(z.literal('')),
  logoUrl:            z.string().trim().url('Must be a valid URL').optional().or(z.literal('')),

  // Contact
  mobile:          z.string().regex(INDIAN_MOBILE, 'Invalid mobile').optional(),
  alternateMobile: z.string().regex(INDIAN_MOBILE, 'Invalid mobile').optional().or(z.literal('')),
  email:           z.string().email('Invalid email').toLowerCase().optional(),
  website:         z.string().trim().url('Must be a valid URL').optional().or(z.literal('')),

  // Address
  address: z.object({
    line1:   z.string().trim().min(1).max(200),
    line2:   z.string().trim().max(200).optional(),
    city:    z.string().trim().min(1).max(100),
    state:   z.string().trim().min(1),
    pincode: z.string().regex(PINCODE, 'Invalid 6-digit pincode'),
    country: z.string().default('India'),
  }).optional(),

  // Settings
  settings: z.object({
    appointmentDuration: z.coerce.number().int().min(5).max(120).optional(),
    workingDays:         z.array(z.coerce.number().int().min(0).max(6)).optional(),
    workingHours: z.object({
      start: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
      end:   z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
    }).optional(),
    tokenPrefix:            z.string().trim().max(5).optional(),
    invoicePrefix:          z.string().trim().max(10).optional(),
    pharmacyInvoicePrefix:  z.string().trim().max(10).optional(),
    patientIdPrefix:        z.string().trim().max(5).optional(),
    printHeader:         z.string().trim().max(200).optional().or(z.literal('')),
    printFooter:         z.string().trim().max(500).optional().or(z.literal('')),
    enableSMS:           z.boolean().optional(),
    enableWhatsApp:      z.boolean().optional(),
    enableOnlineBooking: z.boolean().optional(),
    reminderLeadHours:   z.number().int().refine((n) => [2, 4, 6, 12, 24, 48].includes(n), {
      message: 'Must be one of 2, 4, 6, 12, 24, 48 hours',
    }).optional(),
  }).optional(),

  // Bank / payment details
  bankAccount: z.object({
    accountHolderName: z.string().trim().max(100).optional().or(z.literal('')),
    bankName:          z.string().trim().max(100).optional().or(z.literal('')),
    accountNumber:     z.string().trim().max(20).optional().or(z.literal('')),
    ifscCode:          z.string().trim().toUpperCase().max(11).optional().or(z.literal('')),
    upiId:             z.string().trim().max(50).optional().or(z.literal('')),
  }).optional(),
});

export type UpdateClinicInput = z.infer<typeof updateClinicSchema>;
