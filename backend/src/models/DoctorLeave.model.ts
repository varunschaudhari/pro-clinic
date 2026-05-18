import { Schema, model, Document, Types } from 'mongoose';

export interface IDoctorLeave extends Document {
  clinicId:   Types.ObjectId;
  doctorId:   Types.ObjectId;
  date:       string;   // YYYY-MM-DD
  isFullDay:  boolean;
  startTime?: string;   // HH:MM — only when !isFullDay
  endTime?:   string;   // HH:MM — only when !isFullDay
  reason?:    string;
  createdBy:  Types.ObjectId;
  createdAt:  Date;
  updatedAt:  Date;
}

const DoctorLeaveSchema = new Schema<IDoctorLeave>(
  {
    clinicId:  { type: Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
    doctorId:  { type: Schema.Types.ObjectId, ref: 'User',   required: true, index: true },
    date:      { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    isFullDay: { type: Boolean, default: true },
    startTime: { type: String, match: /^\d{2}:\d{2}$/ },
    endTime:   { type: String, match: /^\d{2}:\d{2}$/ },
    reason:    { type: String, trim: true, maxlength: 200 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

DoctorLeaveSchema.index({ clinicId: 1, doctorId: 1, date: 1 });

export const DoctorLeave = model<IDoctorLeave>('DoctorLeave', DoctorLeaveSchema);
