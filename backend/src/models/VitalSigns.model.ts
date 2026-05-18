import { Schema, model, Document, Types } from 'mongoose';

export interface IVitalSigns extends Document {
  clinicId: Types.ObjectId;
  patientId: Types.ObjectId;
  appointmentId: Types.ObjectId;
  recordedBy: Types.ObjectId;

  bloodPressure?: {
    systolic: number;   // mmHg
    diastolic: number;
  };
  pulseRate?: number;          // bpm
  temperature?: number;        // Celsius
  weight?: number;             // kg
  height?: number;             // cm
  bmi?: number;                // Calculated
  spo2?: number;               // %
  respiratoryRate?: number;    // breaths/min

  bloodSugar?: {
    value: number;
    unit: 'mg/dL' | 'mmol/L';
    type: 'fasting' | 'postprandial' | 'random' | 'hba1c';
  };

  painScale?: number; // 0-10

  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const VitalSignsSchema = new Schema<IVitalSigns>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', required: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    bloodPressure: {
      systolic: { type: Number, min: 0, max: 300 },
      diastolic: { type: Number, min: 0, max: 200 },
      _id: false,
    },
    pulseRate: { type: Number, min: 0, max: 300 },
    temperature: { type: Number, min: 25, max: 45 },
    weight: { type: Number, min: 0, max: 500 },
    height: { type: Number, min: 0, max: 300 },
    bmi: { type: Number },
    spo2: { type: Number, min: 0, max: 100 },
    respiratoryRate: { type: Number, min: 0, max: 100 },

    bloodSugar: {
      value: { type: Number },
      unit: { type: String, enum: ['mg/dL', 'mmol/L'], default: 'mg/dL' },
      type: { type: String, enum: ['fasting', 'postprandial', 'random', 'hba1c'] },
      _id: false,
    },

    painScale: { type: Number, min: 0, max: 10 },
    notes: { type: String, maxlength: 500 },
  },
  {
    timestamps: true,
  }
);

VitalSignsSchema.index({ clinicId: 1, appointmentId: 1 }, { unique: true });
VitalSignsSchema.index({ clinicId: 1, patientId: 1, createdAt: -1 });

// Auto-calculate BMI
VitalSignsSchema.pre('save', function (next) {
  if (this.weight && this.height && this.height > 0) {
    const heightM = this.height / 100;
    this.bmi = parseFloat((this.weight / (heightM * heightM)).toFixed(1));
  }
  next();
});

export const VitalSigns = model<IVitalSigns>('VitalSigns', VitalSignsSchema);
