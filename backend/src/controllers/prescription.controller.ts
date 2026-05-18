import { Request, Response } from 'express';
import { PrescriptionService } from '../services/prescription.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { listPrescriptionsSchema } from '../utils/validators/prescription.validator';

export const listPrescriptions = asyncHandler(async (req: Request, res: Response) => {
  const parsed = listPrescriptionsSchema.safeParse(req.query);
  const params = parsed.success ? parsed.data : { page: 1, limit: 20 };

  const result = await PrescriptionService.listPrescriptions(
    req.clinicId!,
    params as Parameters<typeof PrescriptionService.listPrescriptions>[1],
    req.user!.userId,
    req.user!.role
  );

  return ApiResponse.paginated(res, result);
});

export const createPrescription = asyncHandler(async (req: Request, res: Response) => {
  const rx = await PrescriptionService.createPrescription(
    req.clinicId!,
    req.body,
    req.user!.userId,
    req.user!.role
  );

  return ApiResponse.created(res, rx, 'Prescription created successfully');
});

export const getPrescription = asyncHandler(async (req: Request, res: Response) => {
  const rx = await PrescriptionService.getPrescriptionById(
    req.clinicId!,
    req.params.id,
    req.user!.userId,
    req.user!.role
  );

  return ApiResponse.success(res, rx);
});

export const updatePrescription = asyncHandler(async (req: Request, res: Response) => {
  const rx = await PrescriptionService.updatePrescription(
    req.clinicId!,
    req.params.id,
    req.body,
    req.user!.userId,
    req.user!.role
  );

  return ApiResponse.success(res, rx, 'Prescription updated successfully');
});

export const recordPrint = asyncHandler(async (req: Request, res: Response) => {
  const result = await PrescriptionService.recordPrint(
    req.clinicId!,
    req.params.id,
    req.user!.userId,
    req.user!.role
  );

  return ApiResponse.success(res, result);
});

export const deletePrescription = asyncHandler(async (req: Request, res: Response) => {
  await PrescriptionService.deletePrescription(
    req.clinicId!,
    req.params.id,
    req.user!.userId,
    req.user!.role
  );

  return ApiResponse.noContent(res);
});
