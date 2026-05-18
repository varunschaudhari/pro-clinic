import { Request, Response } from 'express';
import { PatientService } from '../services/patient.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { listPatientsSchema } from '../utils/validators/patient.validator';

export const createPatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await PatientService.createPatient(
    req.clinicId!,
    req.body,
    req.user!.userId
  );
  return ApiResponse.created(res, patient, 'Patient registered successfully');
});

export const listPatients = asyncHandler(async (req: Request, res: Response) => {
  const parsed = listPatientsSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(422).json({ success: false, message: 'Invalid query params', errors: parsed.error.errors });
    return;
  }
  const result = await PatientService.listPatients(req.clinicId!, parsed.data);
  return ApiResponse.paginated(res, result);
});

export const getPatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await PatientService.getPatientById(req.clinicId!, req.params.patientId);
  return ApiResponse.success(res, patient);
});

export const updatePatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await PatientService.updatePatient(
    req.clinicId!,
    req.params.patientId,
    req.body
  );
  return ApiResponse.success(res, patient, 'Patient updated successfully');
});

export const deletePatient = asyncHandler(async (req: Request, res: Response) => {
  await PatientService.deletePatient(req.clinicId!, req.params.patientId, req.user!.userId);
  return ApiResponse.noContent(res);
});

export const searchPatients = asyncHandler(async (req: Request, res: Response) => {
  const query = (req.query.q as string) ?? '';
  const limit = Math.min(parseInt(req.query.limit as string ?? '10', 10), 20);
  const results = await PatientService.searchPatients(req.clinicId!, query, limit);
  return ApiResponse.success(res, results);
});
