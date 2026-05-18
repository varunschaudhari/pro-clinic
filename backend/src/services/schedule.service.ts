import { Types } from 'mongoose';
import { DoctorSchedule } from '../models/DoctorSchedule.model';
import { DoctorLeave }    from '../models/DoctorLeave.model';
import { Appointment }    from '../models/Appointment.model';
import { User }           from '../models/User.model';
import { ApiError }       from '../utils/ApiError';
import { ROLES }          from '../constants';
import type { UpsertScheduleInput, AddLeaveInput } from '../utils/validators/schedule.validator';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert "HH:MM" to total minutes from midnight */
const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** Convert total minutes to "HH:MM" */
const fromMinutes = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** Generate slot list from startTime..endTime with step slotDurationMinutes */
function generateSlots(startTime: string, endTime: string, durationMins: number) {
  const slots: Array<{ slotStart: string; slotEnd: string }> = [];
  const end = toMinutes(endTime);
  let cur = toMinutes(startTime);
  while (cur + durationMins <= end) {
    slots.push({ slotStart: fromMinutes(cur), slotEnd: fromMinutes(cur + durationMins) });
    cur += durationMins;
  }
  return slots;
}

/** True when [aStart,aEnd) overlaps [bStart,bEnd) (all HH:MM strings) */
const overlaps = (aS: string, aE: string, bS: string, bE: string) =>
  toMinutes(aS) < toMinutes(bE) && toMinutes(aE) > toMinutes(bS);

// ── Service ───────────────────────────────────────────────────────────────────

export class ScheduleService {

  // ── Get schedule ────────────────────────────────────────────────────────────

  static async getSchedule(clinicId: string, doctorId: string) {
    await ScheduleService.assertDoctor(clinicId, doctorId);
    const rows = await DoctorSchedule.find({
      clinicId: new Types.ObjectId(clinicId),
      doctorId: new Types.ObjectId(doctorId),
    }).sort({ dayOfWeek: 1 }).lean();
    return rows;
  }

  // ── Upsert schedule (full replace per day) ──────────────────────────────────

  static async upsertSchedule(
    clinicId: string,
    doctorId: string,
    input: UpsertScheduleInput
  ) {
    await ScheduleService.assertDoctor(clinicId, doctorId);
    const cid = new Types.ObjectId(clinicId);
    const did = new Types.ObjectId(doctorId);

    // Upsert each day in the input; days omitted from input are left untouched
    const ops = input.days.map((day) => ({
      updateOne: {
        filter: { clinicId: cid, doctorId: did, dayOfWeek: day.dayOfWeek },
        update: { $set: { ...day, clinicId: cid, doctorId: did } },
        upsert: true,
      },
    }));

    await DoctorSchedule.bulkWrite(ops);
    return ScheduleService.getSchedule(clinicId, doctorId);
  }

  // ── Available slots for a date ─────────────────────────────────────────────

  static async getAvailability(clinicId: string, doctorId: string, date: string) {
    await ScheduleService.assertDoctor(clinicId, doctorId);
    const cid = new Types.ObjectId(clinicId);
    const did = new Types.ObjectId(doctorId);

    const dayOfWeek = new Date(date).getDay();

    const daySchedule = await DoctorSchedule.findOne({
      clinicId: cid,
      doctorId: did,
      dayOfWeek,
      isActive: true,
    }).lean();

    if (!daySchedule) {
      return { available: false, reason: 'not_scheduled', slots: [] };
    }

    // Full-day leave?
    const fullDayLeave = await DoctorLeave.findOne({
      clinicId: cid,
      doctorId: did,
      date,
      isFullDay: true,
    }).lean();

    if (fullDayLeave) {
      return { available: false, reason: 'on_leave', slots: [] };
    }

    // Partial leaves for that day
    const partialLeaves = await DoctorLeave.find({
      clinicId: cid,
      doctorId: did,
      date,
      isFullDay: false,
    }).lean();

    // Already-booked appointments (non-cancelled)
    const booked = await Appointment.find({
      clinicId: cid,
      doctorId: did,
      appointmentDate: new Date(date),
      status: { $nin: ['cancelled', 'no_show'] },
    }).select('slotStart').lean();

    const bookedCounts = new Map<string, number>();
    for (const appt of booked) {
      if (appt.slotStart) {
        bookedCounts.set(appt.slotStart, (bookedCounts.get(appt.slotStart) ?? 0) + 1);
      }
    }

    const rawSlots = generateSlots(
      daySchedule.startTime,
      daySchedule.endTime,
      daySchedule.slotDurationMinutes
    );

    const now = new Date();
    const isToday = date === now.toISOString().slice(0, 10);
    const nowMins = now.getHours() * 60 + now.getMinutes();

    const slots = rawSlots.map(({ slotStart, slotEnd }) => {
      const isPast = isToday && toMinutes(slotStart) <= nowMins;
      const onLeave = partialLeaves.some((l) =>
        l.startTime && l.endTime && overlaps(slotStart, slotEnd, l.startTime, l.endTime)
      );
      const bookedCount = bookedCounts.get(slotStart) ?? 0;
      const isFull = bookedCount >= daySchedule.maxPatientsPerSlot;

      return {
        slotStart,
        slotEnd,
        available: !isPast && !onLeave && !isFull,
        bookedCount,
        maxPatientsPerSlot: daySchedule.maxPatientsPerSlot,
        reason: isPast ? 'past' : onLeave ? 'leave' : isFull ? 'full' : null,
      };
    });

    return {
      available: true,
      slotDurationMinutes: daySchedule.slotDurationMinutes,
      slots,
    };
  }

  // ── Leaves ──────────────────────────────────────────────────────────────────

  static async getLeaves(clinicId: string, doctorId: string, from: string, to: string) {
    await ScheduleService.assertDoctor(clinicId, doctorId);
    return DoctorLeave.find({
      clinicId: new Types.ObjectId(clinicId),
      doctorId: new Types.ObjectId(doctorId),
      date: { $gte: from, $lte: to },
    }).sort({ date: 1 }).lean();
  }

  static async addLeave(
    clinicId: string,
    doctorId: string,
    input: AddLeaveInput,
    createdBy: string
  ) {
    await ScheduleService.assertDoctor(clinicId, doctorId);
    return DoctorLeave.create({
      clinicId:  new Types.ObjectId(clinicId),
      doctorId:  new Types.ObjectId(doctorId),
      createdBy: new Types.ObjectId(createdBy),
      ...input,
    });
  }

  static async deleteLeave(clinicId: string, doctorId: string, leaveId: string) {
    await ScheduleService.assertDoctor(clinicId, doctorId);
    const leave = await DoctorLeave.findOneAndDelete({
      _id:      new Types.ObjectId(leaveId),
      clinicId: new Types.ObjectId(clinicId),
      doctorId: new Types.ObjectId(doctorId),
    });
    if (!leave) throw ApiError.notFound('Leave entry');
  }

  // ── All doctors with schedule summary (for admin list view) ─────────────────

  static async listDoctorsWithSchedule(clinicId: string) {
    const cid = new Types.ObjectId(clinicId);
    const doctors = await User.find({
      clinicId: cid,
      role:     ROLES.DOCTOR,
      isDeleted: false,
      isActive:  true,
    }).select('name specialization avatarUrl').lean();

    const schedules = await DoctorSchedule.find({ clinicId: cid }).lean();

    const scheduleMap = new Map<string, number[]>();
    for (const s of schedules) {
      const key = s.doctorId.toString();
      if (s.isActive) {
        if (!scheduleMap.has(key)) scheduleMap.set(key, []);
        scheduleMap.get(key)!.push(s.dayOfWeek);
      }
    }

    return doctors.map((d) => ({
      ...d,
      activeDays: scheduleMap.get(d._id.toString()) ?? [],
    }));
  }

  // ── Guard: doctor must belong to clinic ─────────────────────────────────────

  private static async assertDoctor(clinicId: string, doctorId: string) {
    const doctor = await User.findOne({
      _id:       new Types.ObjectId(doctorId),
      clinicId:  new Types.ObjectId(clinicId),
      role:      ROLES.DOCTOR,
      isDeleted: false,
    }).lean();
    if (!doctor) throw ApiError.notFound('Doctor');
  }
}
