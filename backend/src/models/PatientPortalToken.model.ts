import { Schema, model, Document, Types } from 'mongoose';

export interface IPatientPortalToken extends Document {
  clinicId:        Types.ObjectId;
  patientId:       Types.ObjectId;
  token:           string;
  expiresAt:       Date;
  isActive:        boolean;
  createdBy:       Types.ObjectId;
  accessCount:     number;
  lastAccessedAt?: Date;
  createdAt:       Date;
  updatedAt:       Date;
}

const PatientPortalTokenSchema = new Schema<IPatientPortalToken>(
  {
    clinicId:       { type: Schema.Types.ObjectId, ref: 'Clinic',  required: true },
    patientId:      { type: Schema.Types.ObjectId, ref: 'Patient', required: true },
    token:          { type: String, required: true, unique: true },
    expiresAt:      { type: Date,   required: true },
    isActive:       { type: Boolean, default: true },
    createdBy:      { type: Schema.Types.ObjectId, ref: 'User',    required: true },
    accessCount:    { type: Number, default: 0 },
    lastAccessedAt: { type: Date },
  },
  { timestamps: true }
);

PatientPortalTokenSchema.index({ clinicId: 1, patientId: 1 });

export const PatientPortalToken = model<IPatientPortalToken>(
  'PatientPortalToken',
  PatientPortalTokenSchema
);
