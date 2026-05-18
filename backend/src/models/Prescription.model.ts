import { Schema, model, Document, Types } from 'mongoose';

export interface IPrescriptionMedicine {
  medicineId?: Types.ObjectId; // Optional link to PharmacyItem
  name: string;
  genericName?: string;
  dosage: string;           // e.g., "500mg"
  frequency: string;        // OD, BD, TDS, QID...
  duration: string;         // e.g., "5 days", "1 week"
  durationDays?: number;    // Numeric for dispensing
  unit: string;             // tablet, capsule, ml
  route?: string;           // oral, topical, IV
  instructions?: string;    // With food, before sleep
  quantity?: number;        // Calculated quantity to dispense
  isDispensed: boolean;
}

export interface IPrescription extends Document {
  clinicId: Types.ObjectId;
  patientId: Types.ObjectId;
  appointmentId: Types.ObjectId;
  doctorId: Types.ObjectId;

  prescriptionNumber: string; // Auto-generated

  diagnosis: string[];
  icdCodes?: string[];       // ICD-10 codes

  medicines: IPrescriptionMedicine[];

  labTests: {
    name: string;
    urgency?: 'routine' | 'urgent' | 'stat';
    notes?: string;
  }[];

  procedures?: string[];

  advice?: string;           // General patient advice
  dietAdvice?: string;
  followUpDate?: Date;
  followUpInstructions?: string;

  doctorNotes?: string;      // Internal notes (not printed)
  printedAt?: Date;
  printCount: number;

  isDeleted: boolean;
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const MedicineSchema = new Schema<IPrescriptionMedicine>(
  {
    medicineId: { type: Schema.Types.ObjectId, ref: 'PharmacyItem', sparse: true },
    name: { type: String, required: true, trim: true },
    genericName: { type: String, trim: true },
    dosage: { type: String, required: true, trim: true },
    frequency: { type: String, required: true },
    duration: { type: String, required: true, trim: true },
    durationDays: { type: Number, min: 1 },
    unit: { type: String, required: true, trim: true },
    route: { type: String, trim: true, default: 'oral' },
    instructions: { type: String, trim: true },
    quantity: { type: Number, min: 0 },
    isDispensed: { type: Boolean, default: false },
  },
  { _id: true }
);

const PrescriptionSchema = new Schema<IPrescription>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    prescriptionNumber: { type: String, required: true },

    diagnosis: [{ type: String, required: true, trim: true }],
    icdCodes: [{ type: String, trim: true }],

    medicines: [MedicineSchema],

    labTests: [
      {
        name: { type: String, required: true, trim: true },
        urgency: { type: String, enum: ['routine', 'urgent', 'stat'], default: 'routine' },
        notes: { type: String, trim: true },
        _id: false,
      },
    ],

    procedures: [{ type: String, trim: true }],

    advice: { type: String, maxlength: 1000 },
    dietAdvice: { type: String, maxlength: 500 },
    followUpDate: { type: Date },
    followUpInstructions: { type: String, maxlength: 300 },

    doctorNotes: { type: String, maxlength: 1000 },
    printedAt: { type: Date },
    printCount: { type: Number, default: 0 },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

PrescriptionSchema.index({ clinicId: 1, prescriptionNumber: 1 }, { unique: true });
PrescriptionSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });
PrescriptionSchema.index({ clinicId: 1, appointmentId: 1 });
PrescriptionSchema.index({ clinicId: 1, doctorId: 1, createdAt: -1 });

PrescriptionSchema.pre(/^find/, function (this: any, next) {
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
});

export const Prescription = model<IPrescription>('Prescription', PrescriptionSchema);
