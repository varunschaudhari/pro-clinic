import { Request, Response } from 'express';
import { AppointmentService } from '../services/appointment.service';
import { AuditService } from '../services/audit.service';
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

  const appt = appointment as any;
  AuditService.log({
    clinicId: req.clinicId!, action: 'CREATE', entity: 'Appointment',
    entityId: appt?._id ?? req.clinicId!.toString(), entityLabel: appt?.tokenDisplay ?? '',
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Booked appointment ${appt?.tokenDisplay ?? ''}`,
  });

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

  AuditService.log({
    clinicId: req.clinicId!, action: 'UPDATE', entity: 'Appointment',
    entityId: req.params.id, entityLabel: (appointment as any).tokenDisplay ?? '',
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Updated appointment ${(appointment as any).tokenDisplay ?? ''}`,
  });

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

  AuditService.log({
    clinicId: req.clinicId!, action: 'UPDATE', entity: 'Appointment',
    entityId: req.params.id, entityLabel: (appointment as any).tokenDisplay ?? '',
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Changed appointment ${(appointment as any).tokenDisplay ?? ''} status to ${req.body.status}`,
  });

  return ApiResponse.success(res, appointment, 'Status updated');
});

// ── Delete ────────────────────────────────────────────────────────────────────
export const deleteAppointment = asyncHandler(async (req: Request, res: Response) => {
  await AppointmentService.deleteAppointment(
    req.clinicId!,
    req.params.id,
    req.user!.userId
  );

  AuditService.log({
    clinicId: req.clinicId!, action: 'DELETE', entity: 'Appointment',
    entityId: req.params.id, entityLabel: req.params.id,
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Deleted appointment`,
  });

  return ApiResponse.noContent(res);
});
