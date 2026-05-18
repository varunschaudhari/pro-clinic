import { Request, Response } from 'express';
import { ScheduleService } from '../services/schedule.service';
import { ApiResponse }     from '../utils/ApiResponse';
import { asyncHandler }    from '../utils/asyncHandler';
import {
  upsertScheduleSchema,
  addLeaveSchema,
  availabilityQuerySchema,
} from '../utils/validators/schedule.validator';

export const listDoctors = asyncHandler(async (req: Request, res: Response) => {
  const doctors = await ScheduleService.listDoctorsWithSchedule(req.clinicId!.toString());
  return ApiResponse.success(res, doctors);
});

export const getSchedule = asyncHandler(async (req: Request, res: Response) => {
  const schedule = await ScheduleService.getSchedule(
    req.clinicId!.toString(),
    req.params.doctorId
  );
  return ApiResponse.success(res, schedule);
});

export const upsertSchedule = asyncHandler(async (req: Request, res: Response) => {
  const parsed = upsertScheduleSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
    return res.status(422).json({ success: false, message: 'Validation failed', errors });
  }
  const schedule = await ScheduleService.upsertSchedule(
    req.clinicId!.toString(),
    req.params.doctorId,
    parsed.data
  );
  return ApiResponse.success(res, schedule, 'Schedule updated');
});

export const getAvailability = asyncHandler(async (req: Request, res: Response) => {
  const parsed = availabilityQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(422).json({ success: false, message: 'date param (YYYY-MM-DD) required' });
  }
  const result = await ScheduleService.getAvailability(
    req.clinicId!.toString(),
    req.params.doctorId,
    parsed.data.date
  );
  return ApiResponse.success(res, result);
});

export const getLeaves = asyncHandler(async (req: Request, res: Response) => {
  const today = new Date().toISOString().slice(0, 10);
  const from  = (req.query.from as string) ?? today;
  const to    = (req.query.to   as string) ?? today.slice(0, 7) + '-31'; // default: rest of month
  const leaves = await ScheduleService.getLeaves(
    req.clinicId!.toString(),
    req.params.doctorId,
    from,
    to
  );
  return ApiResponse.success(res, leaves);
});

export const addLeave = asyncHandler(async (req: Request, res: Response) => {
  const parsed = addLeaveSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
    return res.status(422).json({ success: false, message: 'Validation failed', errors });
  }
  const leave = await ScheduleService.addLeave(
    req.clinicId!.toString(),
    req.params.doctorId,
    parsed.data,
    req.user!.userId.toString()
  );
  return ApiResponse.created(res, leave, 'Leave added');
});

export const deleteLeave = asyncHandler(async (req: Request, res: Response) => {
  await ScheduleService.deleteLeave(
    req.clinicId!.toString(),
    req.params.doctorId,
    req.params.leaveId
  );
  return ApiResponse.noContent(res);
});
