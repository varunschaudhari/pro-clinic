import { Schema, model, Document } from 'mongoose';
import {
  CLINIC_TYPES,
  ClinicType,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUS,
  INDIAN_STATES,
} from '../constants';
import { IAddress } from '../types';

export interface IClinic extends Document {
  name: string;
  slug: string;
  type: ClinicType;
  registrationNumber?: string;
  gstin?: string;

  address: IAddress;
  mobile: string;
  alternateMobile?: string;
  email: string;
  website?: string;

  logoUrl?: string;

  bankAccount?: {
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    upiId?: string;
  };

  subscription: {
    plan: string;
    status: string;
    startDate: Date;
    endDate: Date;
    maxDoctors: number;
    maxPatients: number;
  };

  settings: {
    currency: string;
    timezone: string;
    dateFormat: string;
    appointmentDuration: number; // minutes
    workingDays: number[]; // 0=Sun, 6=Sat
    workingHours: {
      start: string; // HH:MM
      end: string;
    };
    enableSMS: boolean;
    enableWhatsApp: boolean;
    enableOnlineBooking: boolean;
    reminderLeadHours: number; // hours before appointment to send reminder
    tokenPrefix: string;
    invoicePrefix: string;
    patientIdPrefix: string;
    // Print settings
    printHeader?: string;  // tagline shown above clinic name on prints
    printFooter?: string;  // disclaimer / footer text on prints
  };

  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>(
  {
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, enum: INDIAN_STATES },
    pincode: {
      type: String,
      required: true,
      match: [/^\d{6}$/, 'Invalid PIN code'],
    },
    country: { type: String, default: 'India' },
  },
  { _id: false }
);

const ClinicSchema = new Schema<IClinic>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'],
    },
    type: { type: String, required: true, enum: CLINIC_TYPES },
    registrationNumber: { type: String, trim: true, sparse: true },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      match: [/^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$/, 'Invalid GSTIN format'],
      sparse: true,
    },

    address: { type: AddressSchema, required: true },
    mobile: {
      type: String,
      required: true,
      unique: true,
      match: [/^[6-9]\d{9}$/, 'Invalid Indian mobile number'],
    },
    alternateMobile: {
      type: String,
      match: [/^[6-9]\d{9}$/, 'Invalid Indian mobile number'],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    website: { type: String, trim: true },
    logoUrl: { type: String },

    bankAccount: {
      accountHolderName: { type: String, trim: true },
      bankName:          { type: String, trim: true },
      accountNumber:     { type: String, trim: true },
      ifscCode:          { type: String, trim: true, uppercase: true },
      upiId:             { type: String, trim: true },
      _id: false,
    },

    subscription: {
      plan: {
        type: String,
        enum: Object.values(SUBSCRIPTION_PLANS),
        default: SUBSCRIPTION_PLANS.TRIAL,
      },
      status: {
        type: String,
        enum: Object.values(SUBSCRIPTION_STATUS),
        default: SUBSCRIPTION_STATUS.ACTIVE,
      },
      startDate: { type: Date, default: Date.now },
      endDate: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
      },
      maxDoctors: { type: Number, default: 1 },
      maxPatients: { type: Number, default: 500 },
    },

    settings: {
      currency: { type: String, default: 'INR' },
      timezone: { type: String, default: 'Asia/Kolkata' },
      dateFormat: { type: String, default: 'DD/MM/YYYY' },
      appointmentDuration: { type: Number, default: 15 },
      workingDays: { type: [Number], default: [1, 2, 3, 4, 5, 6] },
      workingHours: {
        start: { type: String, default: '09:00' },
        end: { type: String, default: '18:00' },
      },
      enableSMS: { type: Boolean, default: false },
      enableWhatsApp: { type: Boolean, default: false },
      enableOnlineBooking: { type: Boolean, default: false },
      reminderLeadHours: { type: Number, default: 24, enum: [2, 4, 6, 12, 24, 48] },
      tokenPrefix: { type: String, default: 'T' },
      invoicePrefix: { type: String, default: 'INV' },
      patientIdPrefix: { type: String, default: 'CX' },
      printHeader: { type: String, trim: true, maxlength: 200 },
      printFooter: { type: String, trim: true, maxlength: 500 },
    },

    isActive: { type: Boolean, default: true, index: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ClinicSchema.index({ isDeleted: 1, isActive: 1 });
ClinicSchema.index({ 'subscription.status': 1, 'subscription.endDate': 1 });

// Exclude soft-deleted by default
ClinicSchema.pre(/^find/, function (this: any, next) {
  if (!this.getQuery().isDeleted) {
    this.where({ isDeleted: false });
  }
  next();
});

export const Clinic = model<IClinic>('Clinic', ClinicSchema);
