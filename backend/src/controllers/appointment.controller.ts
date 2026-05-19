import { Request, Response } from 'express';
import { AppointmentService } from '../services/appointment.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { listAppointmentsSchema } from '../utils/validators/appointment.validator';

// ── List ──────────────────────────────────────────────────────────────────────
export const listAppointments = asyncHandler(async (req: Request, res: Response) => {
  const parsed = listAppointmentsSchema.safeParse(req.query);
  const params = parsed.success ? parsed.data : { page: 1, limit: 100 };

  const result = await AppointmentService.listAppointments(
    req.clinicId!,
    params as Parameters<typeof AppointmentService.listAppointments>[1],
    req.user!.userId,
    req.user!.role
  );

  return ApiResponse.paginated(res, result);
});

// ── Stats ─────────────────────────────────────────────────────────────────────
export const getTodayStats = asyncHandler(async (req: Request, res: Response) => {
  const date     = (req.query.date as string) || new Date().toISOString().slice(0, 10);
  const doctorId = req.query.doctorId as string | undefined;

  const stats = await AppointmentService.getTodayStats(
    req.clinicId!,
    date,
    doctorId,
    req.user!.userId,
    req.user!.role
  );

  return ApiResponse.success(res, stats);
});

// ── Create ────────────────────────────────────────────────────────────────────
export const createAppointment = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await AppointmentService.createAppointment(
    req.clinicId!,
    req.body,
    req.user!.userId,
    req.user!.role
  );

  return ApiResponse.created(res, appointment, 'Appointment booked successfully');
});

// ── Get single ────────────────────────────────────────────────────────────────
export const getAppointmentById = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await AppointmentService.getAppointmentById(
    req.clinicId!,
    req.params.id,
    req.user!.userId,
    req.user!.role
  );

  return ApiResponse.success(res, appointment);
});

// ── Update ────────────────────────────────────────────────────────────────────
export const updateAppointment = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await AppointmentService.updateAppointment(
    req.clinicId!,
    req.params.id,
    req.body,
    req.user!.userId,
    req.user!.role
  );

  return ApiResponse.success(res, appointment, 'Appointment updated');
});

// ── Update status ─────────────────────────────────────────────────────────────
export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await AppointmentService.updateStatus(
    req.clinicId!,
    req.params.id,
    req.body,
    req.user!.userId,
    req.user!.role
  );

  return ApiResponse.success(res, appointment, 'Status updated');
});

// ── Delete ────────────────────────────────────────────────────────────────────
export const deleteAppointment = asyncHandler(async (req: Request, res: Response) => {
  await AppointmentService.deleteAppointment(
    req.clinicId!,
    req.params.id,
    req.user!.userId
  );

  return ApiResponse.noContent(res);
});
