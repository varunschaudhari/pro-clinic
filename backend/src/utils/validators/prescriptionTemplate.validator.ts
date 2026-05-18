import { z } from 'zod';

const medicineTplSchema = z.object({
  name:          z.string().trim().min(1, 'Name required'),
  genericName:   z.string().trim().optional(),
  dosage:        z.string().trim().min(1, 'Dosage required'),
  frequency:     z.string().min(1, 'Frequency required'),
  durationValue: z.string().optional(),
  durationUnit:  z.enum(['days', 'weeks', 'months']).default('days'),
  unit:          z.string().min(1, 'Unit required'),
  route:         z.string().optional(),
  instructions:  z.string().optional(),
  quantity:      z.string().optional(),
});

export const createTemplateSchema = z.object({
  name:       z.string().trim().min(1, 'Template name required').max(100),
  scope:      z.enum(['doctor', 'clinic']).default('doctor'),
  medicines:  z.array(medicineTplSchema).min(1, 'At least one medicine required'),
  advice:     z.string().max(1000).optional(),
  dietAdvice: z.string().max(500).optional(),
});

export const updateTemplateSchema = createTemplateSchema.partial().extend({
  medicines: z.array(medicineTplSchema).min(1, 'At least one medicine required').optional(),
});

export const listTemplatesSchema = z.object({
  scope: z.enum(['doctor', 'clinic', 'all']).optional(),
  q:     z.string().optional(),
});
