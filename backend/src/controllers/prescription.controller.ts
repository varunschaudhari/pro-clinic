import { Request, Response } from 'express';
import { PrescriptionService } from '../services/prescription.service';
import { AuditService } from '../services/audit.service';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { listPrescriptionsSchema } from '../utils/validators/prescription.validator';
import { Prescription } from '../models/Prescription.model';

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

  const rxDoc = rx as any;
  AuditService.log({
    clinicId: req.clinicId!, action: 'CREATE', entity: 'Prescription',
    entityId: rxDoc?._id ?? req.clinicId!.toString(), entityLabel: rxDoc?.prescriptionNumber ?? '',
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Created prescription ${rxDoc?.prescriptionNumber ?? ''}`,
  });

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

  AuditService.log({
    clinicId: req.clinicId!, action: 'UPDATE', entity: 'Prescription',
    entityId: req.params.id, entityLabel: (rx as any).prescriptionNumber ?? '',
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Updated prescription ${(rx as any).prescriptionNumber ?? ''}`,
  });

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

  AuditService.log({
    clinicId: req.clinicId!, action: 'DELETE', entity: 'Prescription',
    entityId: req.params.id, entityLabel: req.params.id,
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Deleted prescription`,
  });

  return ApiResponse.noContent(res);
});

// GET /prescriptions/lookup?number=RX-2025-0001
export const lookupPrescription = asyncHandler(async (req: Request, res: Response) => {
  const { number } = req.query as { number?: string };
  if (!number?.trim()) throw ApiError.badRequest('Prescription number is required');

  const rx = await Prescription.findOne({
    clinicId: req.clinicId!,
    prescriptionNumber: number.trim().toUpperCase(),
  })
    .populate('doctorId', 'name specialization')
    .populate('patientId', 'name patientId age ageUnit gender mobile bloodGroup')
    .lean();

  if (!rx) throw ApiError.notFound('Prescription not found');

  return ApiResponse.success(res, rx);
});
