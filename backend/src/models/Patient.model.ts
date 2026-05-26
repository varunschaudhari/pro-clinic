import { Schema, model, Document, Types } from 'mongoose';
import { GENDERS, BLOOD_GROUPS, INDIAN_STATES, Gender } from '../constants';
import { IAddress } from '../types';

export interface IPatient extends Document {
  clinicId: Types.ObjectId;
  patientId: string; // Auto-generated: CX-0001

  name: string;
  mobile: string; // Primary identifier in India
  alternateMobile?: string;
  email?: string;

  gender: Gender;
  dob?: Date;
  age?: number; // Calculated or entered if DOB unknown
  ageUnit?: 'years' | 'months' | 'days';

  bloodGroup?: string;
  height?: number; // cm
  weight?: number; // kg

  address?: IAddress;

  emergencyContact?: {
    name: string;
    mobile: string;
    relation: string;
  };

  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];

  insurance?: {
    provider: string;
    policyNumber: string;
    validTill?: Date;
  };

  aadharLast4?: string;  // Last 4 digits only — privacy
  abhaId?: string;       // Ayushman Bharat Health Account

  visitCount: number;
  lastVisitDate?: Date;
  totalOutstanding: number; // Pending dues

  referredBy?: Types.ObjectId; // Doctor who referred
  source?: 'walkin' | 'online' | 'referral' | 'camp';

  notes?: string;
  smsOptIn: boolean; // patient consent for SMS/WhatsApp notifications

  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>(
  {
    line1: { type: String, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, enum: INDIAN_STATES },
    pincode: { type: String, match: [/^\d{6}$/, 'Invalid PIN code'] },
    country: { type: String, default: 'India' },
  },
  { _id: false }
);

const PatientSchema = new Schema<IPatient>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
    patientId: { type: String, required: true, trim: true },

    name: { type: String, required: true, trim: true, maxlength: 100 },
    mobile: {
      type: String,
      required: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Invalid Indian mobile number'],
    },
    alternateMobile: {
      type: String,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Invalid Indian mobile number'],
    },
    email: { type: String, lowercase: true, trim: true, sparse: true },

    gender: { type: String, required: true, enum: GENDERS },
    dob: { type: Date },
    age: { type: Number, min: 0, max: 150 },
    ageUnit: { type: String, enum: ['years', 'months', 'days'], default: 'years' },

    bloodGroup: { type: String, enum: BLOOD_GROUPS },
    height: { type: Number, min: 0 },
    weight: { type: Number, min: 0 },

    address: { type: AddressSchema },

    emergencyContact: {
      name: { type: String, trim: true },
      mobile: { type: String, match: [/^[6-9]\d{9}$/, 'Invalid mobile'] },
      relation: { type: String, trim: true },
      _id: false,
    },

    allergies: [{ type: String, trim: true }],
    chronicConditions: [{ type: String, trim: true }],
    currentMedications: [{ type: String, trim: true }],

    insurance: {
      provider: { type: String, trim: true },
      policyNumber: { type: String, trim: true },
      validTill: { type: Date },
      _id: false,
    },

    aadharLast4: { type: String, match: [/^\d{4}$/, 'Must be last 4 digits'] },
    abhaId: { type: String, trim: true },

    visitCount: { type: Number, default: 0 },
    lastVisitDate: { type: Date },
    totalOutstanding: { type: Number, default: 0 },

    referredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    source: { type: String, enum: ['walkin', 'online', 'referral', 'camp'], default: 'walkin' },

    notes:     { type: String, maxlength: 1000 },
    smsOptIn:  { type: Boolean, default: true },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

PatientSchema.index({ clinicId: 1, patientId: 1 }, { unique: true });
PatientSchema.index({ clinicId: 1, mobile: 1 }, { unique: true });
PatientSchema.index({ clinicId: 1, isDeleted: 1 });
PatientSchema.index({ clinicId: 1, name: 'text', mobile: 'text' }); // text search
PatientSchema.index({ clinicId: 1, lastVisitDate: -1 });

PatientSchema.virtual('calculatedAge').get(function () {
  if (this.dob) {
    const ageDiff = Date.now() - this.dob.getTime();
    return Math.floor(ageDiff / (365.25 * 24 * 60 * 60 * 1000));
  }
  return this.age;
});

PatientSchema.pre(/^find/, function (this: any, next) {
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
});

export const Patient = model<IPatient>('Patient', PatientSchema);
