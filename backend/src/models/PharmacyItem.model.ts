import { Schema, model, Document, Types } from 'mongoose';
import { MEDICINE_UNITS, GST_RATES } from '../constants';

export interface IPharmacyItem extends Document {
  clinicId: Types.ObjectId;

  name: string;
  genericName?: string;
  brand?: string;
  manufacturer?: string;

  category: 'medicine' | 'consumable' | 'equipment' | 'supplement' | 'other';
  unit: string;             // tablet, capsule, syrup, etc.
  packSize?: number;        // e.g., 10 (tablets per strip)

  currentStock: number;
  reorderLevel: number;
  maxStock?: number;

  batches: {
    batchNumber: string;
    expiryDate: Date;
    purchasePrice: number;
    mrp: number;             // Maximum Retail Price
    sellingPrice: number;
    quantity: number;
    purchasedAt?: Date;
    supplierId?: Types.ObjectId;
  }[];

  sellingPrice: number;     // Current active selling price
  mrp: number;              // Current MRP
  purchasePrice: number;    // Latest purchase price

  hsnCode?: string;         // For GST
  gstRate: number;          // %, one of [0, 5, 12, 18]
  isgstExempt: boolean;

  schedule?: 'H' | 'H1' | 'X' | 'G' | 'OTC'; // Drug schedule in India
  requiresPrescription: boolean;

  location?: string;         // Shelf location
  notes?: string;

  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema = new Schema(
  {
    batchNumber: { type: String, required: true, trim: true },
    expiryDate: { type: Date, required: true },
    purchasePrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 0 },
    purchasedAt: { type: Date, default: Date.now },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
  },
  { _id: true }
);

const PharmacyItemSchema = new Schema<IPharmacyItem>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },

    name: { type: String, required: true, trim: true, maxlength: 200 },
    genericName: { type: String, trim: true },
    brand: { type: String, trim: true },
    manufacturer: { type: String, trim: true },

    category: {
      type: String,
      enum: ['medicine', 'consumable', 'equipment', 'supplement', 'other'],
      default: 'medicine',
    },
    unit: { type: String, required: true, enum: MEDICINE_UNITS },
    packSize: { type: Number, min: 1 },

    currentStock: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 10, min: 0 },
    maxStock: { type: Number, min: 0 },

    batches: [BatchSchema],

    sellingPrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    purchasePrice: { type: Number, default: 0, min: 0 },

    hsnCode: { type: String, trim: true },
    gstRate: { type: Number, enum: GST_RATES, default: 0 },
    isgstExempt: { type: Boolean, default: false },

    schedule: { type: String, enum: ['H', 'H1', 'X', 'G', 'OTC'] },
    requiresPrescription: { type: Boolean, default: false },

    location: { type: String, trim: true },
    notes: { type: String, maxlength: 500 },

    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

PharmacyItemSchema.index({ clinicId: 1, name: 1 });
PharmacyItemSchema.index({ clinicId: 1, genericName: 1 });
PharmacyItemSchema.index({ clinicId: 1, currentStock: 1 }); // Low stock queries
PharmacyItemSchema.index({ clinicId: 1, 'batches.expiryDate': 1 }); // Expiry alerts
PharmacyItemSchema.index({ clinicId: 1, name: 'text', genericName: 'text', brand: 'text' });
PharmacyItemSchema.index({ clinicId: 1, isDeleted: 1, isActive: 1 });

PharmacyItemSchema.virtual('isLowStock').get(function () {
  return this.currentStock <= this.reorderLevel;
});

PharmacyItemSchema.virtual('nearExpiryBatches').get(function () {
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return this.batches.filter((b) => b.expiryDate <= thirtyDaysLater && b.quantity > 0);
});

PharmacyItemSchema.pre(/^find/, function (this: any, next) {
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
});

export const PharmacyItem = model<IPharmacyItem>('PharmacyItem', PharmacyItemSchema);
