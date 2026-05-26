import { Request, Response } from 'express';
import { Types } from 'mongoose';

import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse }  from '../utils/ApiResponse';
import { ApiError }     from '../utils/ApiError';
import { Clinic }       from '../models/Clinic.model';
import { User }         from '../models/User.model';
import { Patient }      from '../models/Patient.model';
import { Appointment }  from '../models/Appointment.model';
import { nextSeq }      from '../models/Counter.model';
import { ScheduleService } from '../services/schedule.service';

// ── Helper: validate clinic & online booking enabled ─────────────────────────

async function resolveClinic(slug: string) {
  const clinic = await Clinic.findOne({ slug, isActive: true, isDeleted: false }).lean();
  if (!clinic) throw ApiError.notFound('Clinic');
  if (!clinic.settings.enableOnlineBooking) {
    throw ApiError.forbidden('Online booking is not enabled for this clinic');
  }
  return clinic;
}

// ── GET /booking/clinic/:slug ─────────────────────────────────────────────────

export const getClinicInfo = asyncHandler(async (req: Request, res: Response) => {
  const clinic = await resolveClinic(req.params.slug);

  const doctors = await User.find({
    clinicId: clinic._id,
    role: 'Doctor',
    isActive: true,
    isDeleted: false,
  })
    .select('name specialization consultationFee qualifications bio avatarUrl')
    .lean();

  return ApiResponse.success(res, {
    clinic: {
      _id:     String(clinic._id),
      name:    clinic.name,
      slug:    clinic.slug,
      type:    clinic.type,
      address: clinic.address,
      mobile:  clinic.mobile,
      email:   clinic.email,
      logoUrl: clinic.logoUrl,
      settings: {
        workingDays:         clinic.settings.workingDays,
        workingHours:        clinic.settings.workingHours,
        appointmentDuration: clinic.settings.appointmentDuration,
        timezone:            clinic.settings.timezone,
      },
    },
    doctors,
  });
});

// ── GET /booking/clinic/:slug/slots?doctorId=&date= ───────────────────────────

export const getDoctorSlots = asyncHandler(async (req: Request, res: Response) => {
  const clinic    = await resolveClinic(req.params.slug);
  const doctorId  = req.query.doctorId  as string;
  const date      = req.query.date      as string;

  if (!doctorId || !Types.ObjectId.isValid(doctorId)) throw ApiError.badRequest('doctorId is required');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))    throw ApiError.badRequest('date must be YYYY-MM-DD');

  // Ensure doctor belongs to this clinic
  const doctor = await User.findOne({
    _id: doctorId, clinicId: clinic._id, role: 'Doctor', isActive: true, isDeleted: false,
  }).lean();
  if (!doctor) throw ApiError.notFound('Doctor');

  const availability = await ScheduleService.getAvailability(String(clinic._id), doctorId, date);
  return ApiResponse.success(res, availability);
});

// ── POST /booking/clinic/:slug/appointments ───────────────────────────────────

export const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const clinic = await resolveClinic(req.params.slug);
  const clinicId = clinic._id as Types.ObjectId;

  const {
    doctorId, date, slotStart, visitType, chiefComplaint,
    patient: pd,
  } = req.body;

  // ── Validate required fields ──────────────────────────────────────────────
  if (!doctorId || !Types.ObjectId.isValid(doctorId)) throw ApiError.badRequest('doctorId is required');
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))    throw ApiError.badRequest('date must be YYYY-MM-DD');
  if (!slotStart || !/^\d{2}:\d{2}$/.test(slotStart)) throw ApiError.badRequest('slotStart is required');
  if (!pd?.name?.trim())    throw ApiError.badRequest('Patient name is required');
  if (!pd?.mobile || !/^[6-9]\d{9}$/.test(pd.mobile)) throw ApiError.badRequest('Valid 10-digit mobile is required');
  if (!pd?.gender || !['male', 'female', 'other'].includes(pd.gender)) throw ApiError.badRequest('Gender is required');

  // ── Validate doctor ───────────────────────────────────────────────────────
  const doctor = await User.findOne({
    _id: doctorId, clinicId, role: 'Doctor', isActive: true, isDeleted: false,
  }).lean();
  if (!doctor) throw ApiError.notFound('Doctor');

  // ── Validate slot availability ────────────────────────────────────────────
  const availability = await ScheduleService.getAvailability(String(clinicId), doctorId, date);
  const slot = availability.slots.find((s) => s.slotStart === slotStart);
  if (!slot)          throw ApiError.badRequest('Slot not found');
  if (!slot.available) throw ApiError.badRequest('Selected slot is no longer available. Please choose another.');

  // ── Find or create patient ────────────────────────────────────────────────
  let patient = await Patient.findOne({ clinicId, mobile: pd.mobile, isDeleted: false }).lean();

  if (!patient) {
    const seq    = await nextSeq(clinicId, 'patient');
    const prefix = clinic.settings.patientIdPrefix || 'P';
    patient = await Patient.create({
      clinicId,
      patientId: `${prefix}-${String(seq).padStart(3, '0')}`,
      name:      pd.name.trim(),
      mobile:    pd.mobile,
      email:     pd.email?.trim() || undefined,
      gender:    pd.gender,
      dob:       pd.dob ? new Date(pd.dob) : undefined,
      age:       pd.age   ? parseInt(pd.age)  : undefined,
      ageUnit:   pd.ageUnit || 'years',
      source:    'online',
      isActive:  true,
    });
  }

  // ── Create appointment ────────────────────────────────────────────────────
  const tokenNum = await nextSeq(clinicId, `token-${date}`);
  const tokenDisplay = `${clinic.settings.tokenPrefix || 'T'}-${String(tokenNum).padStart(3, '0')}`;

  const apptDate = new Date(`${date}T00:00:00+05:30`);

  const appointment = await Appointment.create({
    clinicId,
    patientId:       patient._id,
    doctorId,
    appointmentDate: apptDate,
    slotStart,
    slotEnd:         slot.slotEnd,
    tokenNumber:     tokenNum,
    tokenDisplay,
    mode:            'scheduled',
    visitType:       visitType || 'new',
    status:          'scheduled',
    chiefComplaint:  chiefComplaint?.trim() || undefined,
  });

  return ApiResponse.success(
    res,
    {
      appointment: {
        _id:          String(appointment._id),
        tokenDisplay,
        date,
        slotStart,
        slotEnd:      slot.slotEnd,
        doctorName:   doctor.name,
        clinicName:   clinic.name,
        clinicAddress: `${clinic.address.city}, ${clinic.address.state}`,
      },
      patient: {
        name:      patient.name,
        patientId: patient.patientId,
        mobile:    patient.mobile,
      },
    },
    'Appointment booked successfully',
    201,
  );
});
