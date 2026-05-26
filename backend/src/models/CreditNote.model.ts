import { Schema, model, Document, Types } from 'mongoose';

export interface ICreditNote extends Document {
  clinicId:             Types.ObjectId;
  creditNoteNumber:     string;
  invoiceId:            Types.ObjectId;
  invoiceNumber:        string;
  patientId:            Types.ObjectId;
  amount:               number;
  reason:               string;
  refundMode:           string;
  refundTransactionId?: string;
  issuedBy:             Types.ObjectId;
  issuedAt:             Date;
  createdAt:            Date;
  updatedAt:            Date;
}

const CreditNoteSchema = new Schema<ICreditNote>(
  {
    clinicId:            { type: Schema.Types.ObjectId, ref: 'Clinic',   required: true, index: true },
    creditNoteNumber:    { type: String, required: true },
    invoiceId:           { type: Schema.Types.ObjectId, ref: 'Invoice',  required: true },
    invoiceNumber:       { type: String, required: true },
    patientId:           { type: Schema.Types.ObjectId, ref: 'Patient',  required: true },
    amount:              { type: Number, required: true },
    reason:              { type: String, required: true, trim: true, maxlength: 500 },
    refundMode:          { type: String, required: true, enum: ['cash', 'upi', 'bank_transfer', 'other'] },
    refundTransactionId: { type: String, trim: true },
    issuedBy:            { type: Schema.Types.ObjectId, ref: 'User', required: true },
    issuedAt:            { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CreditNoteSchema.index({ clinicId: 1, creditNoteNumber: 1 }, { unique: true });
CreditNoteSchema.index({ clinicId: 1, invoiceId: 1 },       { unique: true });

export const CreditNote = model<ICreditNote>('CreditNote', CreditNoteSchema);
