import { Types } from 'mongoose';
import { LabReport } from '../models/LabReport.model';
import { nextSeq } from '../models/Counter.model';
import { ApiError } from '../utils/ApiError';
import type { IPaginatedResponse } from '../types';
import type {
  CreateLabReportInput,
  UpdateLabReportInput,
  UpdateLabStatusInput,
  ListLabReportsInput,
} from '../utils/validators/labReport.validator';

const PATIENT_FIELDS  = 'patientId name mobile gender dob age ageUnit';
const DOCTOR_FIELDS   = 'name';

function toResponse(doc: Record<string, unknown> | null) {
  if (!doc) return doc;
  const { patientId, ...rest } = doc;
  return { ...rest, patient: patientId };
}

// Valid forward-only status transitions
const TRANSITIONS: Record<string, string[]> = {
  ordered:          ['sample_collected', 'cancelled'],
  sample_collected: ['processing', 'cancelled'],
  processing:       ['completed', 'cancelled'],
  completed:        [],
  cancelled:        [],
};

export class LabReportService {
  // ── Create ─────────────────────────────────────────────────────────────────

  static async createLabReport(
    clinicId: Types.ObjectId,
    input: CreateLabReportInput,
    userId: Types.ObjectId,
    userRole: string
  ) {
    const seq          = await nextSeq(clinicId, 'lab');
    const reportNumber = `LAB-${String(seq).padStart(4, '0')}`;

    const report = await LabReport.create({
      clinicId,
      patientId:         new Types.ObjectId(input.patientId),
      appointmentId:     input.appointmentId  ? new Types.ObjectId(input.appointmentId)  : undefined,
      prescriptionId:    input.prescriptionId ? new Types.ObjectId(input.prescriptionId) : undefined,
      orderedBy:         userId,
      reportNumber,
      testName:          input.testName,
      testCategory:      input.testCategory,
      labName:           input.labName,
      labAddress:        input.labAddress,
      labContactNo:      input.labContactNo,
      sampleType:        input.sampleType,
      sampleCollectedAt: input.sampleCollectedAt ? new Date(input.sampleCollectedAt) : undefined,
      reportDate:        input.reportDate ? new Date(input.reportDate) : new Date(),
      results:           input.results ?? [],
      interpretation:    input.interpretation,
      remarks:           input.remarks,
      doctorComment:     input.doctorComment,
      fileUrls:          input.fileUrls ?? [],
      status:            input.status ?? 'ordered',
    });

    const created = await LabReport.findById(report._id)
      .populate('patientId', PATIENT_FIELDS)
      .populate('orderedBy', DOCTOR_FIELDS)
      .lean();
    return toResponse(created as Record<string, unknown> | null);
  }

  // ── List ───────────────────────────────────────────────────────────────────

  static async listLabReports(
    clinicId: Types.ObjectId,
    params: ListLabReportsInput,
    userId: Types.ObjectId,
    userRole: string
  ): Promise<IPaginatedResponse<unknown>> {
    const filter: Record<string, unknown> = { clinicId };

    if (userRole === 'Doctor') filter.orderedBy = userId;
    if (params.patientId)      filter.patientId      = new Types.ObjectId(params.patientId);
    if (params.appointmentId)  filter.appointmentId  = new Types.ObjectId(params.appointmentId);
    if (params.prescriptionId) filter.prescriptionId = new Types.ObjectId(params.prescriptionId);
    if (params.status)         filter.status         = params.status;

    const skip       = (params.page - 1) * params.limit;
    const total      = await LabReport.countDocuments(filter);
    const totalPages = Math.ceil(total / params.limit) || 1;

    const data = await LabReport.find(filter)
      .populate('patientId', PATIENT_FIELDS)
      .populate('orderedBy', DOCTOR_FIELDS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(params.limit)
      .lean();

    const transformed = data.map((d) => toResponse(d as Record<string, unknown>));
    return { data: transformed, total, page: params.page, limit: params.limit, totalPages, hasNext: params.page < totalPages, hasPrev: params.page > 1 };
  }

  // ── Get single ─────────────────────────────────────────────────────────────

  static async getLabReportById(
    clinicId: Types.ObjectId,
    id: string,
    userId: Types.ObjectId,
    userRole: string
  ) {
    const report = await LabReport.findOne({ _id: id, clinicId })
      .populate('patientId', PATIENT_FIELDS)
      .populate('orderedBy', DOCTOR_FIELDS)
      .lean();

    if (!report) throw ApiError.notFound('Lab report not found');

    if (userRole === 'Doctor') {
      const orderedById = (report.orderedBy as unknown as { _id: Types.ObjectId })._id;
      if (!orderedById.equals(userId)) throw ApiError.forbidden('Access denied');
    }

    return toResponse(report as Record<string, unknown>);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  static async updateLabReport(
    clinicId: Types.ObjectId,
    id: string,
    input: UpdateLabReportInput,
    userId: Types.ObjectId,
    userRole: string
  ) {
    const report = await LabReport.findOne({ _id: id, clinicId });
    if (!report) throw ApiError.notFound('Lab report not found');

    if (userRole === 'Doctor' && !report.orderedBy.equals(userId)) {
      throw ApiError.forbidden('You can only edit your own lab reports');
    }

    const updates: Record<string, unknown> = { ...input };
    if (input.sampleCollectedAt) updates.sampleCollectedAt = new Date(input.sampleCollectedAt);
    if (input.reportDate)        updates.reportDate        = new Date(input.reportDate);
    if (input.appointmentId)     updates.appointmentId     = new Types.ObjectId(input.appointmentId);
    if (input.prescriptionId)    updates.prescriptionId    = new Types.ObjectId(input.prescriptionId);

    Object.assign(report, updates);
    await report.save();

    const updated = await LabReport.findById(report._id)
      .populate('patientId', PATIENT_FIELDS)
      .populate('orderedBy', DOCTOR_FIELDS)
      .lean();
    return toResponse(updated as Record<string, unknown> | null);
  }

  // ── Update status ──────────────────────────────────────────────────────────

  static async updateStatus(
    clinicId: Types.ObjectId,
    id: string,
    input: UpdateLabStatusInput,
    userId: Types.ObjectId,
    userRole: string
  ) {
    const report = await LabReport.findOne({ _id: id, clinicId });
    if (!report) throw ApiError.notFound('Lab report not found');

    const allowed = TRANSITIONS[report.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw ApiError.badRequest(
        `Cannot transition from "${report.status}" to "${input.status}". Allowed: ${allowed.join(', ') || 'none'}`
      );
    }

    report.status = input.status;
    if (input.remarks) report.remarks = input.remarks;

    if (input.status === 'sample_collected') {
      report.sampleCollectedAt = new Date();
    }
    if (input.status === 'completed') {
      report.reportDate = new Date();
    }

    await report.save();

    const status = await LabReport.findById(report._id)
      .populate('patientId', PATIENT_FIELDS)
      .populate('orderedBy', DOCTOR_FIELDS)
      .lean();
    return toResponse(status as Record<string, unknown> | null);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  static async deleteLabReport(
    clinicId: Types.ObjectId,
    id: string,
    userId: Types.ObjectId,
    userRole: string
  ) {
    const report = await LabReport.findOne({ _id: id, clinicId });
    if (!report) throw ApiError.notFound('Lab report not found');

    if (userRole === 'Doctor' && !report.orderedBy.equals(userId)) {
      throw ApiError.forbidden('You can only delete your own lab reports');
    }

    report.isDeleted = true;
    report.deletedAt  = new Date();
    await report.save();
  }
}
