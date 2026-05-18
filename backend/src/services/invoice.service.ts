import { Types } from 'mongoose';
import { Invoice } from '../models/Invoice.model';
import { Patient } from '../models/Patient.model';
import { nextSeq } from '../models/Counter.model';
import { ApiError } from '../utils/ApiError';
import type { IPaginatedResponse } from '../types';
import type {
  CreateInvoiceInput,
  RecordPaymentInput,
  CancelInvoiceInput,
  ListInvoicesInput,
} from '../utils/validators/invoice.validator';

// ── Helpers ───────────────────────────────────────────────────────────────────

interface ComputedItem {
  type: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  gstRate: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  referenceId?: Types.ObjectId;
}

function computeItem(raw: CreateInvoiceInput['items'][0], isInterState: boolean): ComputedItem {
  const taxableAmount = parseFloat(((raw.unitPrice * raw.quantity) - raw.discount).toFixed(2));
  const gstAmount     = parseFloat((taxableAmount * raw.gstRate / 100).toFixed(2));

  const cgstAmount = isInterState ? 0 : parseFloat((gstAmount / 2).toFixed(2));
  const sgstAmount = isInterState ? 0 : parseFloat((gstAmount / 2).toFixed(2));
  const igstAmount = isInterState ? gstAmount : 0;
  const totalAmount = parseFloat((taxableAmount + cgstAmount + sgstAmount + igstAmount).toFixed(2));

  return {
    type:         raw.type,
    description:  raw.description,
    hsnCode:      raw.hsnCode,
    quantity:     raw.quantity,
    unitPrice:    raw.unitPrice,
    discount:     raw.discount,
    gstRate:      raw.gstRate,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalAmount,
    referenceId:  raw.referenceId ? new Types.ObjectId(raw.referenceId) : undefined,
  };
}

function computeTotals(items: ComputedItem[]) {
  const subtotal           = parseFloat(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toFixed(2));
  const totalDiscount      = parseFloat(items.reduce((s, i) => s + i.discount, 0).toFixed(2));
  const totalTaxableAmount = parseFloat(items.reduce((s, i) => s + i.taxableAmount, 0).toFixed(2));
  const totalCGST          = parseFloat(items.reduce((s, i) => s + i.cgstAmount, 0).toFixed(2));
  const totalSGST          = parseFloat(items.reduce((s, i) => s + i.sgstAmount, 0).toFixed(2));
  const totalIGST          = parseFloat(items.reduce((s, i) => s + i.igstAmount, 0).toFixed(2));
  const rawTotal           = totalTaxableAmount + totalCGST + totalSGST + totalIGST;
  const roundedTotal       = Math.round(rawTotal);
  const roundOff           = parseFloat((roundedTotal - rawTotal).toFixed(2));

  return { subtotal, totalDiscount, totalTaxableAmount, totalCGST, totalSGST, totalIGST, roundOff, totalAmount: roundedTotal };
}

const PATIENT_FIELDS = 'patientId name mobile gender dob age ageUnit';
const CREATOR_FIELDS = 'name';

// ── Service ───────────────────────────────────────────────────────────────────

export class InvoiceService {
  // ── Create ────────────────────────────────────────────────────────────────

  static async createInvoice(
    clinicId: Types.ObjectId,
    input: CreateInvoiceInput,
    userId: Types.ObjectId,
    userRole: string
  ) {
    const patient = await Patient.findOne({ _id: input.patientId, clinicId }).lean();
    if (!patient) throw ApiError.notFound('Patient not found');

    const seq           = await nextSeq(clinicId, 'invoice');
    const year          = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${String(seq).padStart(4, '0')}`;

    const isInterState = input.isInterState ?? false;
    const computedItems = input.items.map((item) => computeItem(item, isInterState));
    const totals        = computeTotals(computedItems);

    const invoice = await Invoice.create({
      clinicId,
      patientId:          new Types.ObjectId(input.patientId),
      appointmentId:      input.appointmentId ? new Types.ObjectId(input.appointmentId) : undefined,
      invoiceNumber,
      invoiceDate:        new Date(),
      dueDate:            input.dueDate ? new Date(input.dueDate) : undefined,
      items:              computedItems,
      ...totals,
      paidAmount:         0,
      balanceAmount:      totals.totalAmount,
      paymentStatus:      'pending',
      payments:           [],
      isInterState,
      clinicGstin:        input.clinicGstin,
      patientGstin:       input.patientGstin,
      createdBy:          userId,
      notes:              input.notes,
      termsAndConditions: input.termsAndConditions,
    });

    return Invoice.findById(invoice._id)
      .populate('patientId', PATIENT_FIELDS)
      .populate('createdBy', CREATOR_FIELDS)
      .lean();
  }

  // ── List ──────────────────────────────────────────────────────────────────

  static async listInvoices(
    clinicId: Types.ObjectId,
    params: ListInvoicesInput,
    userRole: string
  ): Promise<IPaginatedResponse<unknown>> {
    const filter: Record<string, unknown> = { clinicId };

    if (params.patientId)     filter.patientId     = new Types.ObjectId(params.patientId);
    if (params.appointmentId) filter.appointmentId = new Types.ObjectId(params.appointmentId);
    if (params.paymentStatus) filter.paymentStatus = params.paymentStatus;

    if (params.fromDate || params.toDate) {
      const dateFilter: Record<string, Date> = {};
      if (params.fromDate) dateFilter.$gte = new Date(params.fromDate + 'T00:00:00.000Z');
      if (params.toDate)   dateFilter.$lte = new Date(params.toDate   + 'T23:59:59.999Z');
      filter.invoiceDate = dateFilter;
    }

    const skip       = (params.page - 1) * params.limit;
    const total      = await Invoice.countDocuments(filter);
    const totalPages = Math.ceil(total / params.limit) || 1;

    const data = await Invoice.find(filter)
      .populate('patientId', PATIENT_FIELDS)
      .populate('createdBy', CREATOR_FIELDS)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(params.limit)
      .lean();

    return { data, total, page: params.page, limit: params.limit, totalPages, hasNext: params.page < totalPages, hasPrev: params.page > 1 };
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  static async getStats(clinicId: Types.ObjectId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totals, todayStats] = await Promise.all([
      Invoice.aggregate([
        { $match: { clinicId, isDeleted: false, isCancelled: false } },
        { $group: {
          _id: null,
          totalReceivable: { $sum: '$balanceAmount' },
          totalCollected:  { $sum: '$paidAmount' },
          pendingCount:    { $sum: { $cond: [{ $eq: ['$paymentStatus', 'pending'] }, 1, 0] } },
          partialCount:    { $sum: { $cond: [{ $eq: ['$paymentStatus', 'partial'] }, 1, 0] } },
        }},
      ]),
      Invoice.aggregate([
        { $match: { clinicId, isDeleted: false, isCancelled: false, invoiceDate: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, todayAmount: { $sum: '$totalAmount' }, todayCount: { $sum: 1 } } },
      ]),
    ]);

    return {
      totalReceivable: totals[0]?.totalReceivable ?? 0,
      totalCollected:  totals[0]?.totalCollected  ?? 0,
      pendingCount:    totals[0]?.pendingCount     ?? 0,
      partialCount:    totals[0]?.partialCount     ?? 0,
      todayAmount:     todayStats[0]?.todayAmount  ?? 0,
      todayCount:      todayStats[0]?.todayCount   ?? 0,
    };
  }

  // ── Get single ────────────────────────────────────────────────────────────

  static async getInvoiceById(clinicId: Types.ObjectId, id: string) {
    const inv = await Invoice.findOne({ _id: id, clinicId })
      .populate('patientId', PATIENT_FIELDS)
      .populate('createdBy', CREATOR_FIELDS)
      .lean();
    if (!inv) throw ApiError.notFound('Invoice not found');
    return inv;
  }

  // ── Record payment ────────────────────────────────────────────────────────

  static async recordPayment(
    clinicId: Types.ObjectId,
    id: string,
    input: RecordPaymentInput,
    userId: Types.ObjectId
  ) {
    const inv = await Invoice.findOne({ _id: id, clinicId });
    if (!inv) throw ApiError.notFound('Invoice not found');
    if (inv.isCancelled) throw ApiError.badRequest('Cannot record payment on a cancelled invoice');
    if (inv.balanceAmount <= 0) throw ApiError.badRequest('Invoice is already fully paid');

    if (input.amount > inv.balanceAmount + 0.01) {
      throw ApiError.badRequest(`Amount exceeds balance of ₹${inv.balanceAmount.toFixed(2)}`);
    }

    inv.payments.push({
      amount:        input.amount,
      mode:          input.mode,
      transactionId: input.transactionId,
      paidAt:        new Date(),
      receivedBy:    userId,
      notes:         input.notes,
    });

    await inv.save(); // pre-save hook updates paidAmount, balanceAmount, paymentStatus

    return Invoice.findById(inv._id)
      .populate('patientId', PATIENT_FIELDS)
      .populate('createdBy', CREATOR_FIELDS)
      .lean();
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  static async cancelInvoice(
    clinicId: Types.ObjectId,
    id: string,
    input: CancelInvoiceInput,
    userId: Types.ObjectId,
    userRole: string
  ) {
    const inv = await Invoice.findOne({ _id: id, clinicId });
    if (!inv) throw ApiError.notFound('Invoice not found');
    if (inv.isCancelled) throw ApiError.badRequest('Invoice is already cancelled');
    if (inv.paidAmount > 0) throw ApiError.badRequest('Cannot cancel an invoice with recorded payments');

    if (userRole !== 'ClinicAdmin') throw ApiError.forbidden('Only ClinicAdmin can cancel invoices');

    inv.isCancelled         = true;
    inv.cancelledAt         = new Date();
    inv.cancellationReason  = input.reason;
    inv.cancelledBy         = userId;
    await inv.save();

    return inv.toJSON();
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  static async deleteInvoice(
    clinicId: Types.ObjectId,
    id: string,
    userId: Types.ObjectId,
    userRole: string
  ) {
    const inv = await Invoice.findOne({ _id: id, clinicId });
    if (!inv) throw ApiError.notFound('Invoice not found');
    if (userRole !== 'ClinicAdmin') throw ApiError.forbidden('Only ClinicAdmin can delete invoices');

    inv.isDeleted = true;
    inv.deletedAt = new Date();
    await inv.save();
  }
}
