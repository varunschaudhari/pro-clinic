import { Schema, model, Document, Types } from 'mongoose';

export interface ITemplateMedicine {
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  durationValue?: string;
  durationUnit: 'days' | 'weeks' | 'months';
  unit: string;
  route?: string;
  instructions?: string;
  quantity?: string;
}

export interface IPrescriptionTemplate extends Document {
  clinicId: Types.ObjectId;
  name: string;
  scope: 'doctor' | 'clinic';
  createdBy: Types.ObjectId;
  medicines: ITemplateMedicine[];
  advice?: string;
  dietAdvice?: string;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateMedicineSchema = new Schema<ITemplateMedicine>(
  {
    name:          { type: String, required: true, trim: true },
    genericName:   { type: String, trim: true },
    dosage:        { type: String, required: true, trim: true },
    frequency:     { type: String, required: true },
    durationValue: { type: String },
    durationUnit:  { type: String, enum: ['days', 'weeks', 'months'], default: 'days' },
    unit:          { type: String, required: true, trim: true },
    route:         { type: String, trim: true, default: 'oral' },
    instructions:  { type: String, trim: true },
    quantity:      { type: String },
  },
  { _id: false }
);

const PrescriptionTemplateSchema = new Schema<IPrescriptionTemplate>(
  {
    clinicId:   { type: Schema.Types.ObjectId, ref: 'Clinic',  required: true, index: true },
    name:       { type: String, required: true, trim: true, maxlength: 100 },
    scope:      { type: String, enum: ['doctor', 'clinic'], required: true },
    createdBy:  { type: Schema.Types.ObjectId, ref: 'User',   required: true },
    medicines:  { type: [TemplateMedicineSchema], required: true },
    advice:     { type: String, maxlength: 1000 },
    dietAdvice: { type: String, maxlength: 500 },
    isDeleted:  { type: Boolean, default: false, index: true },
    deletedAt:  { type: Date },
    deletedBy:  { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, toJSON: { virtuals: true } }
);

PrescriptionTemplateSchema.index({ clinicId: 1, scope: 1, isDeleted: 1 });
PrescriptionTemplateSchema.index({ clinicId: 1, createdBy: 1, isDeleted: 1 });

PrescriptionTemplateSchema.pre(/^find/, function (this: any, next) {
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
});

export const PrescriptionTemplate = model<IPrescriptionTemplate>(
  'PrescriptionTemplate',
  PrescriptionTemplateSchema
);
