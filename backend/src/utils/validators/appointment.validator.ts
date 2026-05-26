import { z } from 'zod';

const objectId = /^[a-f\d]{24}$/i;
const timeHHMM = /^\d{2}:\d{2}$/;
const dateYMD  = /^\d{4}-\d{2}-\d{2}$/;

export const createAppointmentSchema = z.object({
  patientId:      z.string().regex(objectId, 'Invalid patient ID'),
  doctorId:       z.string().regex(objectId, 'Invalid doctor ID'),
  appointmentDate: z.string().regex(dateYMD, 'Date must be YYYY-MM-DD'),
  slotStart:      z.string().regex(timeHHMM, 'Time must be HH:MM').optional(),
  slotEnd:        z.string().regex(timeHHMM, 'Time must be HH:MM').optional(),
  mode:           z.enum(['walkin', 'scheduled', 'teleconsult']).default('walkin'),
  visitType:      z.enum(['new', 'followup']).default('new'),
  chiefComplaint: z.string().trim().max(500).optional(),
  notes:          z.string().trim().max(1000).optional(),
  followUpFor:    z.string().regex(objectId).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  cancellationReason: z.string().trim().max(300).optional(),
});

export const listAppointmentsSchema = z.object({
  date:      z.string().regex(dateYMD).optional(),
  fromDate:  z.string().regex(dateYMD).optional(),
  toDate:    z.string().regex(dateYMD).optional(),
  doctorId:  z.string().regex(objectId).optional(),
  patientId: z.string().regex(objectId).optional(),
  status:    z.string().optional(),
  page:      z.coerce.number().min(1).default(1),
  limit:     z.coerce.number().min(1).max(500).default(100),
});

export const updateAppointmentSchema = z.object({
  doctorId:        z.string().regex(objectId, 'Invalid doctor ID').optional(),
  appointmentDate: z.string().regex(dateYMD, 'Date must be YYYY-MM-DD').optional(),
  slotStart:       z.string().regex(timeHHMM, 'Time must be HH:MM').optional(),
  slotEnd:         z.string().regex(timeHHMM, 'Time must be HH:MM').optional(),
  mode:            z.enum(['walkin', 'scheduled', 'teleconsult']).optional(),
  visitType:       z.enum(['new', 'followup']).optional(),
  chiefComplaint:  z.string().trim().max(500).optional(),
  notes:           z.string().trim().max(1000).optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'No fields to update' });

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type UpdateStatusInput      = z.infer<typeof updateStatusSchema>;
export type ListAppointmentsInput  = z.infer<typeof listAppointmentsSchema>;
