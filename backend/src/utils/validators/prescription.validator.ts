import { z } from 'zod';

const objectId = /^[a-f\d]{24}$/i;

const medicineSchema = z.object({
  medicineId:   z.string().regex(objectId).optional(),
  name:         z.string().trim().min(1, 'Medicine name required').max(200),
  genericName:  z.string().trim().max(200).optional(),
  dosage:       z.string().trim().min(1, 'Dosage required').max(50),
  frequency:    z.string().trim().min(1, 'Frequency required'),
  duration:     z.string().trim().min(1, 'Duration required').max(100),
  durationDays: z.coerce.number().min(1).optional(),
  unit:         z.string().trim().min(1, 'Unit required'),
  route:        z.string().trim().optional(),
  instructions: z.string().trim().max(200).optional(),
  quantity:     z.coerce.number().min(0).optional(),
});

const labTestSchema = z.object({
  name:    z.string().trim().min(1).max(200),
  urgency: z.enum(['routine', 'urgent', 'stat']).default('routine'),
  notes:   z.string().trim().max(300).optional(),
});

export const createPrescriptionSchema = z.object({
  appointmentId:        z.string().regex(objectId, 'Invalid appointment ID'),
  diagnosis:            z.array(z.string().trim().min(1)).min(1, 'At least one diagnosis required'),
  icdCodes:             z.array(z.string().trim()).default([]),
  medicines:            z.array(medicineSchema).min(1, 'At least one medicine required'),
  labTests:             z.array(labTestSchema).default([]),
  procedures:           z.array(z.string().trim()).default([]),
  advice:               z.string().trim().max(1000).optional(),
  dietAdvice:           z.string().trim().max(500).optional(),
  followUpDate:         z.string().optional(),
  followUpInstructions: z.string().trim().max(300).optional(),
  doctorNotes:          z.string().trim().max(1000).optional(),
});

// Update allows partial edits; appointmentId cannot change
export const updatePrescriptionSchema = createPrescriptionSchema
  .omit({ appointmentId: true })
  .partial();

export const listPrescriptionsSchema = z.object({
  patientId:     z.string().regex(objectId).optional(),
  appointmentId: z.string().regex(objectId).optional(),
  doctorId:      z.string().regex(objectId).optional(),
  page:          z.coerce.number().min(1).default(1),
  limit:         z.coerce.number().min(1).max(100).default(20),
});

export type CreatePrescriptionInput  = z.infer<typeof createPrescriptionSchema>;
export type UpdatePrescriptionInput  = z.infer<typeof updatePrescriptionSchema>;
export type ListPrescriptionsInput   = z.infer<typeof listPrescriptionsSchema>;
