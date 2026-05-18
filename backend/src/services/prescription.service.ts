import { Types } from 'mongoose';
import { Prescription } from '../models/Prescription.model';
import { Appointment } from '../models/Appointment.model';
import { nextSeq } from '../models/Counter.model';
import { ApiError } from '../utils/ApiError';
import type { IPaginatedResponse } from '../types';
import type {
  CreatePrescriptionInput,
  UpdatePrescriptionInput,
  ListPrescriptionsInput,
} from '../utils/validators/prescription.validator';

const PATIENT_FIELDS = 'patientId name mobile gender dob age ageUnit';
const DOCTOR_FIELDS  = 'name';

export class PrescriptionService {
  // ── Create ────────────────────────────────────────────────────────────────

  static async createPrescription(
    clinicId: Types.ObjectId,
    input: CreatePrescriptionInput,
    userId: Types.ObjectId,
    userRole: string
  ) {
    const appointment = await Appointment.findOne({ _id: input.appointmentId, clinicId }).lean();
    if (!appointment) throw ApiError.notFound('Appointment not found');

    if (userRole === 'Doctor' && !appointment.doctorId.equals(userId)) {
      throw ApiError.forbidden('You can only prescribe for your own appointments');
    }

    const seq = await nextSeq(clinicId, 'prescription');
    const prescriptionNumber = `RX-${String(seq).padStart(4, '0')}`;

    const rx = await Prescription.create({
      clinicId,
      patientId:            appointment.patientId,
      appointmentId:        appointment._id,
      doctorId:             appointment.doctorId,
      prescriptionNumber,
      diagnosis:            input.diagnosis,
      icdCodes:             input.icdCodes ?? [],
      medicines:            input.medicines,
      labTests:             input.labTests ?? [],
      procedures:           input.procedures ?? [],
      advice:               input.advice,
      dietAdvice:           input.dietAdvice,
      followUpDate:         input.followUpDate ? new Date(input.followUpDate) : undefined,
      followUpInstructions: input.followUpInstructions,
      doctorNotes:          input.doctorNotes,
      printCount:           0,
    });

    // Link back to appointment
    await Appointment.findByIdAndUpdate(appointment._id, { prescriptionId: rx._id });

    return Prescription.findById(rx._id)
      .populate('patientId', PATIENT_FIELDS)
      .populate('doctorId', DOCTOR_FIELDS)
      .lean();
  }

  // ── List ──────────────────────────────────────────────────────────────────

  static async listPrescriptions(
    clinicId: Types.ObjectId,
    params: ListPrescriptionsInput,
    userId: Types.ObjectId,
    userRole: string
  ): Promise<IPaginatedResponse<unknown>> {
    const filter: Record<string, unknown> = { clinicId };

    if (userRole === 'Doctor') {
      filter.doctorId = userId;
    } else if (params.doctorId) {
      filter.doctorId = new Types.ObjectId(params.doctorId);
    }

    if (params.patientId)     filter.patientId     = new Types.ObjectId(params.patientId);
    if (params.appointmentId) filter.appointmentId = new Types.ObjectId(params.appointmentId);

    const skip       = (params.page - 1) * params.limit;
    const total      = await Prescription.countDocuments(filter);
    const totalPages = Math.ceil(total / params.limit) || 1;

    const data = await Prescription.find(filter)
      .populate('patientId', PATIENT_FIELDS)
      .populate('doctorId', DOCTOR_FIELDS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(params.limit)
      .lean();

    return {
      data,
      total,
      page: params.page,
      limit: params.limit,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    };
  }

  // ── Get single ────────────────────────────────────────────────────────────

  static async getPrescriptionById(
    clinicId: Types.ObjectId,
    id: string,
    userId: Types.ObjectId,
    userRole: string
  ) {
    const rx = await Prescription.findOne({ _id: id, clinicId })
      .populate('patientId', PATIENT_FIELDS)
      .populate('doctorId', DOCTOR_FIELDS)
      .lean();

    if (!rx) throw ApiError.notFound('Prescription not found');

    if (userRole === 'Doctor' && !(rx.doctorId as Types.ObjectId).equals(userId)) {
      throw ApiError.forbidden('Access denied');
    }

    return rx;
  }

  // ── Update ────────────────────────────────────────────────────────────────

  static async updatePrescription(
    clinicId: Types.ObjectId,
    id: string,
    input: UpdatePrescriptionInput,
    userId: Types.ObjectId,
    userRole: string
  ) {
    const rx = await Prescription.findOne({ _id: id, clinicId });
    if (!rx) throw ApiError.notFound('Prescription not found');

    if (userRole === 'Doctor' && !rx.doctorId.equals(userId)) {
      throw ApiError.forbidden('You can only edit your own prescriptions');
    }

    const updates: Record<string, unknown> = { ...input };
    if (input.followUpDate) {
      updates.followUpDate = new Date(input.followUpDate);
    }
    Object.assign(rx, updates);
    await rx.save();

    return Prescription.findById(rx._id)
      .populate('patientId', PATIENT_FIELDS)
      .populate('doctorId', DOCTOR_FIELDS)
      .lean();
  }

  // ── Record print ──────────────────────────────────────────────────────────

  static async recordPrint(
    clinicId: Types.ObjectId,
    id: string,
    userId: Types.ObjectId,
    userRole: string
  ) {
    const rx = await Prescription.findOne({ _id: id, clinicId });
    if (!rx) throw ApiError.notFound('Prescription not found');

    if (userRole === 'Doctor' && !rx.doctorId.equals(userId)) {
      throw ApiError.forbidden('Access denied');
    }

    rx.printCount += 1;
    rx.printedAt   = new Date();
    await rx.save();

    return { printCount: rx.printCount, printedAt: rx.printedAt };
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  static async deletePrescription(
    clinicId: Types.ObjectId,
    id: string,
    userId: Types.ObjectId,
    userRole: string
  ) {
    const rx = await Prescription.findOne({ _id: id, clinicId });
    if (!rx) throw ApiError.notFound('Prescription not found');

    if (userRole === 'Doctor' && !rx.doctorId.equals(userId)) {
      throw ApiError.forbidden('You can only delete your own prescriptions');
    }

    rx.isDeleted = true;
    rx.deletedAt  = new Date();
    await rx.save();
  }
}
