import { Schema, model, Document, Types } from 'mongoose';

export interface IDoctorSchedule extends Document {
  clinicId: Types.ObjectId;
  doctorId: Types.ObjectId;
  dayOfWeek: number; // 0=Sunday … 6=Saturday
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  slotDurationMinutes: number;
  maxPatientsPerSlot: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DoctorScheduleSchema = new Schema<IDoctorSchedule>(
  {
    clinicId:             { type: Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
    doctorId:             { type: Schema.Types.ObjectId, ref: 'User',   required: true, index: true },
    dayOfWeek:            { type: Number, required: true, min: 0, max: 6 },
    startTime:            { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    endTime:              { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    slotDurationMinutes:  { type: Number, required: true, enum: [10, 15, 20, 30, 45, 60], default: 30 },
    maxPatientsPerSlot:   { type: Number, required: true, min: 1, max: 20, default: 1 },
    isActive:             { type: Boolean, default: true },
  },
  { timestamps: true }
);

DoctorScheduleSchema.index({ clinicId: 1, doctorId: 1, dayOfWeek: 1 }, { unique: true });

export const DoctorSchedule = model<IDoctorSchedule>('DoctorSchedule', DoctorScheduleSchema);
