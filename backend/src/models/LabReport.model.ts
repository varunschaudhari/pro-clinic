import { Schema, model, Document, Types } from 'mongoose';

export interface ILabResult {
  parameter: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal?: boolean;
  flags?: 'H' | 'L' | 'HH' | 'LL' | 'A'; // High, Low, Critical High, Critical Low, Abnormal
}

export interface ILabReport extends Document {
  clinicId: Types.ObjectId;
  patientId: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  prescriptionId?: Types.ObjectId;
  orderedBy: Types.ObjectId; // Doctor

  reportNumber: string;

  testName: string;
  testCategory?: string; // Haematology, Biochemistry, Microbiology, Radiology
  labName?: string;
  labAddress?: string;
  labContactNo?: string;

  sampleType?: string;    // Blood, Urine, Stool, Swab
  sampleCollectedAt?: Date;
  reportDate: Date;

  results: ILabResult[];

  interpretation?: string;
  remarks?: string;
  doctorComment?: string;

  fileUrls: string[];     // Uploaded PDF/image URLs

  status: 'ordered' | 'sample_collected' | 'processing' | 'completed' | 'cancelled';

  isDeleted: boolean;
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const LabResultSchema = new Schema<ILabResult>(
  {
    parameter: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
    unit: { type: String, trim: true },
    referenceRange: { type: String, trim: true },
    isAbnormal: { type: Boolean, default: false },
    flags: { type: String, enum: ['H', 'L', 'HH', 'LL', 'A'] },
  },
  { _id: false }
);

const LabReportSchema = new Schema<ILabReport>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    prescriptionId: { type: Schema.Types.ObjectId, ref: 'Prescription' },
    orderedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    reportNumber: { type: String, required: true },

    testName: { type: String, required: true, trim: true },
    testCategory: { type: String, trim: true },
    labName: { type: String, trim: true },
    labAddress: { type: String, trim: true },
    labContactNo: { type: String, trim: true },

    sampleType: { type: String, trim: true },
    sampleCollectedAt: { type: Date },
    reportDate: { type: Date, required: true, default: Date.now },

    results: [LabResultSchema],

    interpretation: { type: String, maxlength: 2000 },
    remarks: { type: String, maxlength: 1000 },
    doctorComment: { type: String, maxlength: 1000 },

    fileUrls: [{ type: String }],

    status: {
      type: String,
      enum: ['ordered', 'sample_collected', 'processing', 'completed', 'cancelled'],
      default: 'ordered',
      index: true,
    },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

LabReportSchema.index({ clinicId: 1, reportNumber: 1 }, { unique: true });
LabReportSchema.index({ clinicId: 1, patientId: 1, reportDate: -1 });
LabReportSchema.index({ clinicId: 1, appointmentId: 1 });
LabReportSchema.index({ clinicId: 1, status: 1 });

LabReportSchema.pre(/^find/, function (this: any, next) {
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
});

export const LabReport = model<ILabReport>('LabReport', LabReportSchema);
