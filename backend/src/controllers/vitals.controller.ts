import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { VitalSigns } from '../models/VitalSigns.model';
import { Appointment } from '../models/Appointment.model';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

export const getByAppointment = asyncHandler(async (req: Request, res: Response) => {
  const vitals = await VitalSigns.findOne({
    clinicId:      req.clinicId!,
    appointmentId: new Types.ObjectId(req.params.appointmentId),
  }).populate('recordedBy', 'name');

  return ApiResponse.success(res, vitals ?? null);
});

export const getPatientHistory = asyncHandler(async (req: Request, res: Response) => {
  const limit  = Math.min(parseInt((req.query.limit as string) ?? '10'), 50);
  const vitals = await VitalSigns.find({
    clinicId:  req.clinicId!,
    patientId: new Types.ObjectId(req.params.patientId),
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('recordedBy', 'name')
    .populate('appointmentId', 'tokenDisplay appointmentDate slotStart');

  return ApiResponse.success(res, vitals);
});

export const createVitals = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = req.clinicId!;
  const { appointmentId, patientId, ...fields } = req.body;

  // Check appointment belongs to this clinic
  const appt = await Appointment.findOne({
    _id: appointmentId, clinicId,
  });
  if (!appt) throw ApiError.notFound('Appointment');

  // Prevent duplicate (unique index enforces this too, but give a clear message)
  const existing = await VitalSigns.findOne({ clinicId, appointmentId });
  if (existing) throw ApiError.conflict('Vitals already recorded for this appointment. Use PUT to update.');

  const vitals = await VitalSigns.create({
    clinicId,
    appointmentId: new Types.ObjectId(appointmentId),
    patientId:     new Types.ObjectId(patientId),
    recordedBy:    new Types.ObjectId(req.user!.userId),
    ...fields,
  });

  // Link vitalSignsId back to the appointment
  await Appointment.updateOne(
    { _id: appointmentId, clinicId },
    { $set: { vitalSignsId: vitals._id } }
  );

  const populated = await VitalSigns.findById(vitals._id).populate('recordedBy', 'name');
  return ApiResponse.created(res, populated, 'Vitals recorded successfully');
});

export const updateVitals = asyncHandler(async (req: Request, res: Response) => {
  const vitals = await VitalSigns.findOneAndUpdate(
    { _id: req.params.id, clinicId: req.clinicId! },
    { $set: req.body },
    { new: true, runValidators: true }
  ).populate('recordedBy', 'name');

  if (!vitals) throw ApiError.notFound('Vitals');
  return ApiResponse.success(res, vitals);
});
