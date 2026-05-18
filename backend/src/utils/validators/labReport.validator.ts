import { z } from 'zod';

const objectId = /^[a-f\d]{24}$/i;

const labResultSchema = z.object({
  parameter:      z.string().trim().min(1, 'Parameter name required').max(100),
  value:          z.string().trim().min(1, 'Value required').max(100),
  unit:           z.string().trim().max(50).optional(),
  referenceRange: z.string().trim().max(100).optional(),
  isAbnormal:     z.boolean().default(false),
  flags:          z.enum(['H', 'L', 'HH', 'LL', 'A']).optional(),
});

export const createLabReportSchema = z.object({
  patientId:          z.string().regex(objectId, 'Invalid patient ID'),
  appointmentId:      z.string().regex(objectId).optional(),
  prescriptionId:     z.string().regex(objectId).optional(),
  testName:           z.string().trim().min(1, 'Test name required').max(200),
  testCategory:       z.string().trim().max(100).optional(),
  labName:            z.string().trim().max(200).optional(),
  labAddress:         z.string().trim().max(500).optional(),
  labContactNo:       z.string().trim().max(20).optional(),
  sampleType:         z.string().trim().max(50).optional(),
  sampleCollectedAt:  z.string().optional(),
  reportDate:         z.string().optional(),
  results:            z.array(labResultSchema).default([]),
  interpretation:     z.string().trim().max(2000).optional(),
  remarks:            z.string().trim().max(1000).optional(),
  doctorComment:      z.string().trim().max(1000).optional(),
  fileUrls:           z.array(z.string().url('Must be a valid URL')).default([]),
  status:             z.enum(['ordered', 'sample_collected', 'processing', 'completed', 'cancelled']).default('ordered'),
});

export const updateLabReportSchema = createLabReportSchema
  .omit({ patientId: true })
  .partial();

export const updateStatusSchema = z.object({
  status:   z.enum(['ordered', 'sample_collected', 'processing', 'completed', 'cancelled']),
  remarks:  z.string().trim().max(500).optional(),
});

export const listLabReportsSchema = z.object({
  patientId:      z.string().regex(objectId).optional(),
  appointmentId:  z.string().regex(objectId).optional(),
  prescriptionId: z.string().regex(objectId).optional(),
  status:         z.enum(['ordered', 'sample_collected', 'processing', 'completed', 'cancelled']).optional(),
  page:           z.coerce.number().int().min(1).default(1),
  limit:          z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateLabReportInput  = z.infer<typeof createLabReportSchema>;
export type UpdateLabReportInput  = z.infer<typeof updateLabReportSchema>;
export type UpdateLabStatusInput  = z.infer<typeof updateStatusSchema>;
export type ListLabReportsInput   = z.infer<typeof listLabReportsSchema>;
