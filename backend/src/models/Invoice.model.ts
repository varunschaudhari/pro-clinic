import { Schema, model, Document, Types } from 'mongoose';
import { PAYMENT_STATUS, PAYMENT_MODES, INVOICE_ITEM_TYPES, GST_RATES } from '../constants';

export interface IInvoiceItem {
  type: string;
  description: string;
  hsnCode?: string;       // HSN/SAC code for GST
  quantity: number;
  unitPrice: number;
  discount: number;       // Amount discount (not %)
  taxableAmount: number;  // unitPrice * qty - discount
  gstRate: number;        // %
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;     // For inter-state
  totalAmount: number;
  referenceId?: Types.ObjectId; // Prescription/Lab ID
}

export interface IInvoice extends Document {
  clinicId: Types.ObjectId;
  patientId: Types.ObjectId;
  appointmentId?: Types.ObjectId;
  invoiceNumber: string;  // INV-2024-0001

  invoiceDate: Date;
  dueDate?: Date;

  items: IInvoiceItem[];

  subtotal: number;
  totalDiscount: number;
  totalTaxableAmount: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  roundOff: number;
  totalAmount: number;

  paidAmount: number;
  balanceAmount: number;
  paymentStatus: string;

  payments: {
    amount: number;
    mode: string;
    transactionId?: string;
    paidAt: Date;
    receivedBy: Types.ObjectId;
    notes?: string;
  }[];

  // GST fields
  clinicGstin?: string;
  patientGstin?: string;
  isInterState: boolean;    // IGST applies if true

  createdBy: Types.ObjectId;

  notes?: string;
  termsAndConditions?: string;

  isCancelled: boolean;
  cancelledAt?: Date;
  cancellationReason?: string;
  cancelledBy?: Types.ObjectId;

  creditNoteId?: Types.ObjectId;
  refundedAt?:   Date;

  overdueReminderSentAt?: Date;

  isDeleted: boolean;
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<IInvoiceItem>(
  {
    type: { type: String, required: true, enum: INVOICE_ITEM_TYPES },
    description: { type: String, required: true, trim: true },
    hsnCode: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    taxableAmount: { type: Number, required: true },
    gstRate: { type: Number, enum: GST_RATES, default: 0 },
    cgstAmount: { type: Number, default: 0 },
    sgstAmount: { type: Number, default: 0 },
    igstAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    referenceId: { type: Schema.Types.ObjectId },
  },
  { _id: true }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    invoiceNumber: { type: String, required: true },

    invoiceDate: { type: Date, default: Date.now },
    dueDate: { type: Date },

    items: [InvoiceItemSchema],

    subtotal: { type: Number, required: true },
    totalDiscount: { type: Number, default: 0 },
    totalTaxableAmount: { type: Number, required: true },
    totalCGST: { type: Number, default: 0 },
    totalSGST: { type: Number, default: 0 },
    totalIGST: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },

    payments: [
      {
        amount: { type: Number, required: true },
        mode: { type: String, required: true, enum: PAYMENT_MODES },
        transactionId: { type: String, trim: true },
        paidAt: { type: Date, default: Date.now },
        receivedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        notes: { type: String },
        _id: false,
      },
    ],

    clinicGstin: { type: String, trim: true },
    patientGstin: { type: String, trim: true },
    isInterState: { type: Boolean, default: false },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, maxlength: 500 },
    termsAndConditions: { type: String, maxlength: 500 },

    isCancelled: { type: Boolean, default: false },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },

    creditNoteId: { type: Schema.Types.ObjectId, ref: 'CreditNote' },
    refundedAt:   { type: Date },

    overdueReminderSentAt: { type: Date },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

InvoiceSchema.index({ clinicId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ clinicId: 1, patientId: 1, invoiceDate: -1 });
InvoiceSchema.index({ clinicId: 1, paymentStatus: 1 });
InvoiceSchema.index({ clinicId: 1, invoiceDate: -1 });
InvoiceSchema.index({ dueDate: 1, paymentStatus: 1, isDeleted: 1, isCancelled: 1 });

// Keep balance in sync with payments
InvoiceSchema.pre('save', function (next) {
  this.paidAmount = this.payments.reduce((sum, p) => sum + p.amount, 0);
  this.balanceAmount = this.totalAmount - this.paidAmount;
  if (this.balanceAmount <= 0) this.paymentStatus = PAYMENT_STATUS.PAID;
  else if (this.paidAmount > 0) this.paymentStatus = PAYMENT_STATUS.PARTIAL;
  else this.paymentStatus = PAYMENT_STATUS.PENDING;
  next();
});

InvoiceSchema.pre(/^find/, function (this: any, next) {
  if (this.getQuery().isDeleted === undefined) {
    this.where({ isDeleted: false });
  }
  next();
});

export const Invoice = model<IInvoice>('Invoice', InvoiceSchema);
