import crypto from 'crypto';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { PatientPortalToken } from '../models/PatientPortalToken.model';
import { Patient } from '../models/Patient.model';
import { Prescription } from '../models/Prescription.model';
import { LabReport } from '../models/LabReport.model';
import { Clinic } from '../models/Clinic.model';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

const TOKEN_EXPIRY_DAYS = 30;

/** POST /portal/generate — authenticated */
export const generateToken = asyncHandler(async (req: Request, res: Response) => {
  const clinicId  = new Types.ObjectId(req.clinicId!);
  const createdBy = req.user!.userId;
  const { patientId } = req.body as { patientId?: string };

  if (!patientId) throw ApiError.badRequest('patientId is required');
  const patientOid = new Types.ObjectId(patientId);

  // Verify patient belongs to this clinic
  const patient = await Patient.findOne({ _id: patientOid, clinicId, isDeleted: false }).lean();
  if (!patient) throw ApiError.notFound('Patient not found');

  // Deactivate any existing active tokens for this patient (one active link at a time)
  await PatientPortalToken.updateMany(
    { clinicId, patientId: patientOid, isActive: true },
    { $set: { isActive: false } }
  );

  const token     = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await PatientPortalToken.create({ clinicId, patientId: patientOid, token, expiresAt, createdBy });

  return ApiResponse.success(res, { token, expiresAt }, 'Portal link generated');
});

/** POST /portal/revoke — authenticated */
export const revokeToken = asyncHandler(async (req: Request, res: Response) => {
  const clinicId  = new Types.ObjectId(req.clinicId!);
  const { patientId } = req.body as { patientId?: string };

  if (!patientId) throw ApiError.badRequest('patientId is required');

  await PatientPortalToken.updateMany(
    { clinicId, patientId: new Types.ObjectId(patientId), isActive: true },
    { $set: { isActive: false } }
  );

  return ApiResponse.success(res, null, 'Portal access revoked');
});

/** GET /portal/:token — PUBLIC, no auth */
export const getPortalData = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.params;

  const tokenDoc = await PatientPortalToken.findOne({ token }).lean();
  if (!tokenDoc || !tokenDoc.isActive) {
    throw ApiError.notFound('This portal link is invalid or has been revoked.');
  }
  if (tokenDoc.expiresAt < new Date()) {
    throw ApiError.unauthorized('This portal link has expired. Please request a new link from your clinic.');
  }

  // Track access — fire and forget
  PatientPortalToken.updateOne(
    { _id: tokenDoc._id },
    { $inc: { accessCount: 1 }, $set: { lastAccessedAt: new Date() } }
  ).exec().catch(() => {});

  const [clinic, patient, prescriptions, labReports] = await Promise.all([
    Clinic.findById(tokenDoc.clinicId)
      .select('name address mobile email logoUrl')
      .lean(),

    Patient.findById(tokenDoc.patientId)
      .select('name patientId age ageUnit gender bloodGroup mobile')
      .lean(),

    Prescription.find({ patientId: tokenDoc.patientId, clinicId: tokenDoc.clinicId, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('doctorId', 'name specialization')
      .select('prescriptionNumber medicines diagnosis advice dietAdvice followUpDate createdAt doctorId')
      .lean(),

    LabReport.find({ patientId: tokenDoc.patientId, clinicId: tokenDoc.clinicId, isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('orderedBy', 'name')
      .select('reportNumber testName testCategory status reportDate fileUrls results interpretation remarks orderedBy createdAt')
      .lean(),
  ]);

  return ApiResponse.success(res, {
    clinic: {
      name:    (clinic as any)?.name,
      address: (clinic as any)?.address,
      mobile:  (clinic as any)?.mobile,
      logoUrl: (clinic as any)?.logoUrl,
    },
    patient,
    prescriptions,
    labReports,
    expiresAt: tokenDoc.expiresAt,
  });
});
