import { z } from 'zod';

const timeRegex = /^\d{2}:\d{2}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const scheduleDaySchema = z.object({
  dayOfWeek:           z.number().int().min(0).max(6),
  startTime:           z.string().regex(timeRegex, 'Must be HH:MM'),
  endTime:             z.string().regex(timeRegex, 'Must be HH:MM'),
  slotDurationMinutes: z.number().int().refine((n) => [10, 15, 20, 30, 45, 60].includes(n), {
    message: 'Must be one of 10, 15, 20, 30, 45, 60',
  }).default(30),
  maxPatientsPerSlot:  z.number().int().min(1).max(20).default(1),
  isActive:            z.boolean().default(true),
}).refine(
  (d) => d.startTime < d.endTime,
  { message: 'startTime must be before endTime', path: ['endTime'] }
);

export const upsertScheduleSchema = z.object({
  days: z.array(scheduleDaySchema).min(1).max(7),
});

const today = () => new Date().toISOString().slice(0, 10);

export const addLeaveSchema = z.object({
  date:      z.string().regex(dateRegex, 'Must be YYYY-MM-DD'),
  isFullDay: z.boolean().default(true),
  startTime: z.string().regex(timeRegex, 'Must be HH:MM').optional(),
  endTime:   z.string().regex(timeRegex, 'Must be HH:MM').optional(),
  reason:    z.string().trim().max(200).optional(),
}).refine(
  (d) => d.date >= today(),
  { message: 'Cannot add leave for a past date', path: ['date'] }
).refine(
  (d) => d.isFullDay || (d.startTime && d.endTime),
  { message: 'startTime and endTime are required for partial-day leave', path: ['startTime'] }
).refine(
  (d) => d.isFullDay || !d.startTime || !d.endTime || d.startTime < d.endTime,
  { message: 'startTime must be before endTime', path: ['endTime'] }
);

export const addLeaveRangeSchema = z.object({
  startDate: z.string().regex(dateRegex, 'Must be YYYY-MM-DD'),
  endDate:   z.string().regex(dateRegex, 'Must be YYYY-MM-DD'),
  reason:    z.string().trim().max(200).optional(),
}).refine(
  (d) => d.startDate >= today(),
  { message: 'Cannot add leave for a past date', path: ['startDate'] }
).refine(
  (d) => d.startDate <= d.endDate,
  { message: 'startDate must be on or before endDate', path: ['endDate'] }
);

export const availabilityQuerySchema = z.object({
  date: z.string().regex(dateRegex, 'Must be YYYY-MM-DD'),
});

export type UpsertScheduleInput  = z.infer<typeof upsertScheduleSchema>;
export type AddLeaveInput        = z.infer<typeof addLeaveSchema>;
export type AddLeaveRangeInput   = z.infer<typeof addLeaveRangeSchema>;
