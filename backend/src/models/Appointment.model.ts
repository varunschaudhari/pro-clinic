import { Schema, model, Document, Types } from 'mongoose';
import { APPOINTMENT_STATUS, VISIT_TYPES, APPOINTMENT_MODES } from '../constants';

export interface IAppointment extends Document {
  clinicId: Types.ObjectId;
  patientId: Types.ObjectId;
  doctorId: Types.ObjectId;
  createdBy: Types.ObjectId; // Receptionist or patient (online)

  appointmentDate: Date;
  slotStart: string; // HH:MM
  slotEnd: string;

  tokenNumber: number;
  tokenDisplay: string; // T-001

  mode: 'walkin' | 'scheduled' | 'teleconsult';
  visitType: 'new' | 'followup';
  status: string;

  chiefComplaint?: string;
  notes?: string;

  // Timestamps for workflow
  checkedInAt?: Date;
  consultationStartAt?: Date;
  consultationEndAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  cancelledBy?: Types.ObjectId;

  // References created during this appointment
  vitalSignsId?: Types.ObjectId;
  prescriptionId?: Types.ObjectId;
  invoiceId?: Types.ObjectId;

  followUpDate?: Date;
  followUpFor?: Types.ObjectId; // Link to previous appointment

  isDeleted: boolean;
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointment>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    appointmentDate: { type: Date, required: true },
    slotStart: { type: String, required: true, match: [/^\d{2}:\d{2}$/, 'Invalid time format HH:MM'] },
    slotEnd: { type: String, required: true, match: [/^\d{2}:\d{2}$/, 'Invalid time format HH:MM'] },

    tokenNumber: { type: Number, required: true },
    tokenDisplay: { type: String, required: true },

    mode: { type: String, enum: APPOINTMENT_MODES, default: 'walkin' },
    visitType: { type: String, enum: VISIT_TYPES, default: 'new' },
    status: {
      type: String,
      enum: Object.values(APPOINTMENT_STATUS),
      default: APPOINTMENT_STATUS.SCHEDULED,
      index: true,
    },

    chiefComplaint: { type: String, trim: true, maxlength: 500 },
    notes: { type: String, maxlength: 1000 },

    checkedInAt: { type: Date },
    consultationStartAt: { type: Date },
    consultationEndAt: { type: Date },
    cancelledAt: { type: Date },
    cancellationReason: { type: String, maxlength: 300 },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },

    vitalSignsId: { type: Schema.Types.ObjectId, ref: 'VitalSigns' },
    prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription' },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },

    followUpDate: { type: Date },
    followUpFor: { type: Schema.Types.ObjectId, ref: 'Appointment' },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Compound unique: one token per doctor per date
AppointmentSchema.index({ clinicId: 1, doctorId: 1, appointmentDate: 1, tokenNumber: 1 }, { unique: true });
AppointmentSchema.index({ clinicId: 1, patientId: 1, appointmentDate: -1 });
AppointmentSchema.index({ clinicId: 1, doctorId: 1, appointmentDate: 1, status: 1 });
AppointmentSchema.index({ clinicId: 1, appointmentDate: 1 });

AppointmentSchema.virtual('duration').get(function () {
  if (!this.consultationStartAt || !this.consultationEndAt) return null;
  return Math.round(
    (this.consultationEndAt.getTime() - this.consultationStartAt.getTime()) / 60000
  );
});

AppointmentSchema.pre(/^find/, function (this: any, next) {
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
});

export const Appointment = model<IAppointment>('Appointment', AppointmentSchema);
