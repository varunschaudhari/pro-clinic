import { Schema, model, Document, Types } from 'mongoose';

export const STOCK_TRANSACTION_TYPES = [
  'purchase',    // stock received from supplier
  'dispense',    // dispensed against a prescription
  'adjustment',  // manual correction
  'return',      // returned to supplier or by patient
  'expired',     // removed due to expiry
  'sale',        // direct counter sale
] as const;

export type StockTransactionType = (typeof STOCK_TRANSACTION_TYPES)[number];

export interface IStockTransaction extends Document {
  clinicId: Types.ObjectId;
  drugId: Types.ObjectId;
  type: StockTransactionType;

  quantity: number;       // always positive; direction implied by type
  quantityBefore: number;
  quantityAfter: number;

  unitPrice?: number;     // purchase cost per unit
  batchNumber?: string;
  expiryDate?: Date;

  prescriptionId?: Types.ObjectId;
  patientId?: Types.ObjectId;

  notes?: string;
  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const StockTransactionSchema = new Schema<IStockTransaction>(
  {
    clinicId:      { type: Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
    drugId:        { type: Schema.Types.ObjectId, ref: 'PharmacyItem', required: true, index: true },
    type:          { type: String, enum: STOCK_TRANSACTION_TYPES, required: true },

    quantity:      { type: Number, required: true, min: 0.001 },
    quantityBefore:{ type: Number, required: true },
    quantityAfter: { type: Number, required: true },

    unitPrice:     { type: Number, min: 0 },
    batchNumber:   { type: String, trim: true },
    expiryDate:    { type: Date },

    prescriptionId:{ type: Schema.Types.ObjectId, ref: 'Prescription' },
    patientId:     { type: Schema.Types.ObjectId, ref: 'Patient' },

    notes:         { type: String, trim: true, maxlength: 500 },
    createdBy:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

StockTransactionSchema.index({ clinicId: 1, drugId: 1, createdAt: -1 });
StockTransactionSchema.index({ clinicId: 1, prescriptionId: 1 });
StockTransactionSchema.index({ clinicId: 1, patientId: 1 });
StockTransactionSchema.index({ clinicId: 1, type: 1 });

export const StockTransaction = model<IStockTransaction>('StockTransaction', StockTransactionSchema);
