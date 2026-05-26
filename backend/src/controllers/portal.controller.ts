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
import { streamPrescriptionPdf } from '../utils/prescriptionPdf';
import { env } from '../config/env';

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
      .populate('doctorId', 'name specialization qualifications licenseNumber')
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

// ── Shared: resolve & validate a portal token ─────────────────────────────────

async function resolveToken(token: string) {
  const tokenDoc = await PatientPortalToken.findOne({ token }).lean();
  if (!tokenDoc || !tokenDoc.isActive) throw ApiError.notFound('Invalid or revoked link');
  if (tokenDoc.expiresAt < new Date()) throw ApiError.unauthorized('Portal link has expired');
  return tokenDoc;
}

// ── GET /portal/:token/prescription/:rxId/pdf ─────────────────────────────────

export const downloadPrescriptionPdf = asyncHandler(async (req: Request, res: Response) => {
  const tokenDoc = await resolveToken(req.params.token);

  const rx = await Prescription.findOne({
    _id:       req.params.rxId,
    patientId: tokenDoc.patientId,
    clinicId:  tokenDoc.clinicId,
  })
    .populate('doctorId', 'name specialization qualifications licenseNumber')
    .lean();

  if (!rx) throw ApiError.notFound('Prescription not found');

  const [clinic, patient] = await Promise.all([
    Clinic.findById(tokenDoc.clinicId).select('name address mobile logoUrl').lean(),
    Patient.findById(tokenDoc.patientId).select('name patientId age ageUnit gender bloodGroup').lean(),
  ]);

  if (!clinic || !patient) throw ApiError.notFound('Clinic or patient not found');

  const doctor = rx.doctorId as any;

  await streamPrescriptionPdf(
    res,
    { name: clinic.name, address: clinic.address, mobile: clinic.mobile, logoUrl: clinic.logoUrl },
    { name: (patient as any).name, patientId: (patient as any).patientId, age: (patient as any).age, ageUnit: (patient as any).ageUnit, gender: (patient as any).gender, bloodGroup: (patient as any).bloodGroup },
    [{
      _id:                String(rx._id),
      prescriptionNumber: rx.prescriptionNumber,
      createdAt:          rx.createdAt,
      diagnosis:          rx.diagnosis,
      medicines:          rx.medicines as any,
      labTests:           rx.labTests as any,
      advice:             rx.advice,
      dietAdvice:         rx.dietAdvice,
      followUpDate:       rx.followUpDate,
      doctor: {
        name:            doctor?.name ?? 'Unknown',
        specialization:  doctor?.specialization,
        qualifications:  doctor?.qualifications,
        licenseNumber:   doctor?.licenseNumber,
      },
    }],
    req.params.token,
    env.CLIENT_URL,
    `${rx.prescriptionNumber}-${(patient as any).name.replace(/\s+/g, '-')}.pdf`,
  );
});

// ── GET /portal/:token/prescriptions/pdf ──────────────────────────────────────

export const downloadAllPrescriptionsPdf = asyncHandler(async (req: Request, res: Response) => {
  const tokenDoc = await resolveToken(req.params.token);

  const [prescriptions, clinic, patient] = await Promise.all([
    Prescription.find({ patientId: tokenDoc.patientId, clinicId: tokenDoc.clinicId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('doctorId', 'name specialization qualifications licenseNumber')
      .lean(),
    Clinic.findById(tokenDoc.clinicId).select('name address mobile logoUrl').lean(),
    Patient.findById(tokenDoc.patientId).select('name patientId age ageUnit gender bloodGroup').lean(),
  ]);

  if (!clinic || !patient) throw ApiError.notFound('Clinic or patient not found');
  if (!prescriptions.length) throw ApiError.notFound('No prescriptions found');

  const pdfPrescriptions = prescriptions.map(rx => {
    const doctor = rx.doctorId as any;
    return {
      _id:                String(rx._id),
      prescriptionNumber: rx.prescriptionNumber,
      createdAt:          rx.createdAt,
      diagnosis:          rx.diagnosis,
      medicines:          rx.medicines as any,
      labTests:           rx.labTests as any,
      advice:             rx.advice,
      dietAdvice:         rx.dietAdvice,
      followUpDate:       rx.followUpDate,
      doctor: {
        name:           doctor?.name ?? 'Unknown',
        specialization: doctor?.specialization,
        qualifications: doctor?.qualifications,
        licenseNumber:  doctor?.licenseNumber,
      },
    };
  });

  const patientDoc = patient as any;
  const safePatientName = patientDoc.name.replace(/\s+/g, '-');

  await streamPrescriptionPdf(
    res,
    { name: clinic.name, address: clinic.address, mobile: clinic.mobile, logoUrl: clinic.logoUrl },
    { name: patientDoc.name, patientId: patientDoc.patientId, age: patientDoc.age, ageUnit: patientDoc.ageUnit, gender: patientDoc.gender, bloodGroup: patientDoc.bloodGroup },
    pdfPrescriptions,
    req.params.token,
    env.CLIENT_URL,
    `Prescriptions-${safePatientName}.pdf`,
  );
});
