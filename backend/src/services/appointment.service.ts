import { Types } from 'mongoose';
import { Appointment } from '../models/Appointment.model';
import { Patient } from '../models/Patient.model';
import { User } from '../models/User.model';
import { nextSeq } from '../models/Counter.model';
import { ApiError } from '../utils/ApiError';
import { ScheduleService } from './schedule.service';
import type { IPaginatedResponse } from '../types';
import type {
  CreateAppointmentInput,
  UpdateStatusInput,
  ListAppointmentsInput,
} from '../utils/validators/appointment.validator';

// ── Status transitions ────────────────────────────────────────────────────────

const TRANSITIONS: Record<string, string[]> = {
  scheduled:   ['confirmed', 'in_progress', 'cancelled', 'no_show'],
  confirmed:   ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled'],
  completed:   [],
  cancelled:   [],
  no_show:     [],
};

// ── Populate projections ──────────────────────────────────────────────────────

const PATIENT_FIELDS = 'patientId name mobile gender dob age ageUnit';
const DOCTOR_FIELDS  = 'name';
const CREATOR_FIELDS = 'name role';

function toResponse(doc: Record<string, unknown> | null) {
  if (!doc) return doc;
  const { patientId, doctorId, ...rest } = doc;
  return { ...rest, patient: patientId, doctor: doctorId };
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function dayRange(dateStr: string) {
  return {
    $gte: new Date(`${dateStr}T00:00:00.000Z`),
    $lte: new Date(`${dateStr}T23:59:59.999Z`),
  };
}

export class AppointmentService {
  // ── Create ────────────────────────────────────────────────────────────────

  static async createAppointment(
    clinicId: Types.ObjectId,
    input: CreateAppointmentInput,
    createdBy: Types.ObjectId,
    creatorRole: string
  ) {
    // Doctor can only create appointments for themselves
    const doctorId =
      creatorRole === 'Doctor'
        ? createdBy
        : new Types.ObjectId(input.doctorId);

    // Validate patient belongs to this clinic
    const patient = await Patient.findOne({ _id: input.patientId, clinicId, isDeleted: false }).lean();
    if (!patient) throw ApiError.notFound('Patient not found in this clinic');

    // Validate doctor belongs to this clinic with Doctor role
    const doctor = await User.findOne({ _id: doctorId, clinicId, role: 'Doctor', isDeleted: false }).lean();
    if (!doctor) throw ApiError.notFound('Doctor not found in this clinic');

    const dateStr = input.appointmentDate;
    const mode = input.mode ?? 'walkin';

    // For pre-booked slots: validate against doctor's schedule
    if (mode !== 'walkin' && input.slotStart) {
      const availability = await ScheduleService.getAvailability(
        clinicId.toString(),
        doctorId.toString(),
        dateStr
      );
      if (!availability.available) {
        const reason = availability.reason === 'on_leave'
          ? 'Doctor is on leave for this date'
          : 'Doctor has no schedule for this day';
        throw ApiError.badRequest(reason);
      }
      const slot = (availability.slots as any[]).find((s) => s.slotStart === input.slotStart);
      if (!slot) {
        throw ApiError.badRequest('Selected time slot does not exist in the doctor\'s schedule');
      }
      if (!slot.available) {
        const msg = slot.reason === 'full' ? 'This slot is fully booked' : 'This slot is not available';
        throw ApiError.badRequest(msg);
      }
    }

    // Atomic token per doctor per day
    const tokenNumber  = await nextSeq(clinicId, `appt-${doctorId}-${dateStr}`);
    const tokenDisplay = `T-${String(tokenNumber).padStart(3, '0')}`;

    // Default slot time = now (UTC HH:MM) for walk-ins
    const now    = new Date();
    const nowHHMM = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
    const slotStart = input.slotStart ?? nowHHMM;
    const slotEnd   = input.slotEnd   ?? nowHHMM;

    const appt = await Appointment.create({
      clinicId,
      patientId:       new Types.ObjectId(input.patientId),
      doctorId,
      createdBy,
      appointmentDate: new Date(`${dateStr}T00:00:00.000Z`),
      slotStart,
      slotEnd,
      tokenNumber,
      tokenDisplay,
      mode,
      visitType:      input.visitType ?? 'new',
      chiefComplaint: input.chiefComplaint,
      notes:          input.notes,
      followUpFor:    input.followUpFor ? new Types.ObjectId(input.followUpFor) : undefined,
      status:         'scheduled',
    });

    const created = await Appointment.findById(appt._id)
      .populate('patientId', PATIENT_FIELDS)
      .populate('doctorId', DOCTOR_FIELDS)
      .populate('createdBy', CREATOR_FIELDS)
      .lean();
    return toResponse(created as Record<string, unknown> | null);
  }

  // ── List ──────────────────────────────────────────────────────────────────

  static async listAppointments(
    clinicId: Types.ObjectId,
    params: ListAppointmentsInput,
    userId: Types.ObjectId,
    userRole: string
  ): Promise<IPaginatedResponse<unknown>> {
    const filter: Record<string, unknown> = { clinicId };

    // Doctors see only their own queue
    if (userRole === 'Doctor') {
      filter.doctorId = userId;
    } else if (params.doctorId) {
      filter.doctorId = new Types.ObjectId(params.doctorId);
    }

    if (params.patientId) filter.patientId = new Types.ObjectId(params.patientId);
    if (params.date)      filter.appointmentDate = dayRange(params.date);
    if (params.status)    filter.status = params.status;

    const skip  = (params.page - 1) * params.limit;
    const total = await Appointment.countDocuments(filter);
    const totalPages = Math.ceil(total / params.limit) || 1;

    const data = await Appointment.find(filter)
      .populate('patientId', PATIENT_FIELDS)
      .populate('doctorId', DOCTOR_FIELDS)
      .populate('createdBy', CREATOR_FIELDS)
      // Patient history view: newest visit first. Queue view: token order within day.
      .sort(params.patientId ? '-appointmentDate -slotStart' : 'tokenNumber')
      .skip(skip)
      .limit(params.limit)
      .lean();

    return {
      data: data.map((d) => toResponse(d as Record<string, unknown>)),
      total,
      page: params.page,
      limit: params.limit,
      totalPages,
      hasNext: params.page < totalPages,
      hasPrev: params.page > 1,
    };
  }

  // ── Get single ────────────────────────────────────────────────────────────

  static async getAppointmentById(
    clinicId: Types.ObjectId,
    appointmentId: string,
    userId: Types.ObjectId,
    userRole: string
  ) {
    const appt = await Appointment.findOne({ _id: appointmentId, clinicId })
      .populate('patientId', PATIENT_FIELDS)
      .populate('doctorId', DOCTOR_FIELDS)
      .populate('createdBy', CREATOR_FIELDS)
      .lean();

    if (!appt) throw ApiError.notFound('Appointment not found');

    if (userRole === 'Doctor') {
      const docId = (appt.doctorId as unknown as { _id: Types.ObjectId })._id;
      if (!docId.equals(userId)) throw ApiError.forbidden('Access denied');
    }

    return toResponse(appt as Record<string, unknown>);
  }

  // ── Update status ────────────────────────────────────────────────────────

  static async updateStatus(
    clinicId: Types.ObjectId,
    appointmentId: string,
    input: UpdateStatusInput,
    userId: Types.ObjectId,
    userRole: string
  ) {
    const appt = await Appointment.findOne({ _id: appointmentId, clinicId });
    if (!appt) throw ApiError.notFound('Appointment not found');

    if (userRole === 'Doctor' && !appt.doctorId.equals(userId)) {
      throw ApiError.forbidden('Access denied');
    }

    const allowed = TRANSITIONS[appt.status] ?? [];
    if (!allowed.includes(input.status)) {
      throw ApiError.badRequest(
        `Cannot change status from '${appt.status}' to '${input.status}'`
      );
    }

    const now = new Date();
    if (input.status === 'in_progress' && !appt.checkedInAt)       appt.checkedInAt         = now;
    if (input.status === 'in_progress' && !appt.consultationStartAt) appt.consultationStartAt = now;
    if (input.status === 'completed')                               appt.consultationEndAt   = now;
    if (input.status === 'cancelled') {
      appt.cancelledAt        = now;
      appt.cancelledBy        = userId;
      appt.cancellationReason = input.cancellationReason;
    }

    appt.status = input.status;
    await appt.save();

    // On completion: update patient visit stats
    if (input.status === 'completed') {
      await Patient.findByIdAndUpdate(appt.patientId, {
        $inc: { visitCount: 1 },
        lastVisitDate: now,
      });
    }

    const updated = await Appointment.findById(appt._id)
      .populate('patientId', PATIENT_FIELDS)
      .populate('doctorId', DOCTOR_FIELDS)
      .lean();
    return toResponse(updated as Record<string, unknown> | null);
  }

  // ── Soft delete ───────────────────────────────────────────────────────────

  static async deleteAppointment(
    clinicId: Types.ObjectId,
    appointmentId: string,
    userId: Types.ObjectId
  ) {
    const appt = await Appointment.findOne({ _id: appointmentId, clinicId });
    if (!appt) throw ApiError.notFound('Appointment not found');

    if (['completed', 'cancelled', 'no_show'].includes(appt.status)) {
      throw ApiError.badRequest(`Cannot delete a ${appt.status} appointment`);
    }

    appt.isDeleted         = true;
    appt.deletedAt         = new Date();
    appt.status            = 'cancelled';
    appt.cancelledAt       = new Date();
    appt.cancelledBy       = userId;
    appt.cancellationReason = 'Deleted by staff';
    await appt.save();
  }

  // ── Today stats ───────────────────────────────────────────────────────────

  static async getTodayStats(
    clinicId: Types.ObjectId,
    date: string,
    doctorId?: string,
    userId?: Types.ObjectId,
    userRole?: string
  ) {
    const filter: Record<string, unknown> = {
      clinicId,
      appointmentDate: dayRange(date),
      isDeleted: false,
    };

    if (userRole === 'Doctor' && userId) {
      filter.doctorId = userId;
    } else if (doctorId) {
      filter.doctorId = new Types.ObjectId(doctorId);
    }

    const result = await Appointment.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const stats: Record<string, number> = {
      scheduled: 0, confirmed: 0, in_progress: 0,
      completed: 0, cancelled: 0, no_show: 0,
    };
    result.forEach(({ _id, count }: { _id: string; count: number }) => {
      stats[_id] = count;
    });
    return stats;
  }
}
