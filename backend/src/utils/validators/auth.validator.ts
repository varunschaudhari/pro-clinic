import { z } from 'zod';
import { CLINIC_TYPES, INDIAN_STATES, ROLES } from '../../constants';

const mobileSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number (must be 10 digits starting with 6-9)');

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password too long')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/\d/, 'Must contain at least one number');

export const clinicRegistrationSchema = z.object({
  // Clinic details
  clinicName: z.string().trim().min(2).max(100),
  clinicType: z.enum(CLINIC_TYPES),
  clinicMobile: mobileSchema,
  clinicEmail: z.string().trim().email().toLowerCase(),

  // Address
  addressLine1: z.string().trim().min(5).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(2).max(100),
  state: z.enum(INDIAN_STATES),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Invalid PIN code'),

  // ClinicAdmin details
  adminName: z.string().trim().min(2).max(100),
  adminMobile: mobileSchema,
  adminEmail: z.string().trim().email().toLowerCase().optional(),
  adminPassword: passwordSchema,
});

export const loginSchema = z.object({
  mobile: mobileSchema,
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  // Token comes from httpOnly cookie, no body needed
});

export const inviteUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  mobile: mobileSchema,
  email: z.string().trim().email().toLowerCase().optional(),
  role: z.enum([ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.PHARMACIST]),
  specialization: z.string().trim().optional(),
  licenseNumber: z.string().trim().optional(),
  consultationFee: z.number().min(0).optional(),
});

export const acceptInviteSchema = z.object({
  token: z.string().trim().min(1),
  password: passwordSchema,
  name: z.string().trim().min(2).max(100).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().toLowerCase().optional().or(z.literal('')),
  bio: z.string().trim().max(500).optional(),
  specialization: z.string().trim().max(100).optional(),
  licenseNumber: z.string().trim().optional(),
  consultationFee: z.number().min(0).optional(),
  qualifications: z.array(z.string().trim()).optional(),
});

export type ClinicRegistrationInput = z.infer<typeof clinicRegistrationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
