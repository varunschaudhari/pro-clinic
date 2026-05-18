import { z } from 'zod';
import { ROLES } from '../../constants';

export const listStaffSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  role: z.enum([ROLES.DOCTOR, ROLES.RECEPTIONIST, ROLES.PHARMACIST, ROLES.CLINIC_ADMIN]).optional(),
  search: z.string().trim().optional(),
  isActive: z.coerce.boolean().optional(),
});

export const updateStaffSchema = z.object({
  isActive: z.boolean().optional(),
  consultationFee: z.number().min(0).optional(),
  specialization: z.string().trim().optional(),
});

export type ListStaffInput = z.infer<typeof listStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
