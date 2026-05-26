import { Types } from 'mongoose';
import { Invoice } from '../models/Invoice.model';
import { Patient } from '../models/Patient.model';
import { Appointment } from '../models/Appointment.model';
import { Clinic } from '../models/Clinic.model';
import { nextSeq } from '../models/Counter.model';
import { ApiError } from '../utils/ApiError';
import { PharmacyService } from './pharmacy.service';
import type { IPaginatedResponse } from '../types';
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
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

const PATIENT_FIELDS = 'patientId name mobile email gender dob age ageUnit';
const CREATOR_FIELDS = 'name';

// Rename populated `patientId` → `patient` so the frontend can use inv.patient.*
function toResponse(doc: Record<string, unknown> | null) {
  if (!doc) return doc;
  const { patientId, ...rest } = doc;
  return { ...rest, patient: patientId };
}

// ── Service ───────────────────────────────────────────────────────────────────

export class InvoiceService {
  // ── Create ────────────────────────────────────────────────────────────────

  static async createInvoice(
    clinicId: Types.ObjectId,
    input: CreateInvoiceInput,
    userId: Types.ObjectId,
    userRole: string
  ) {
    const [patient, clinic] = await Promise.all([
      Patient.findOne({ _id: input.patientId, clinicId }).lean(),
      Clinic.findById(clinicId).select('settings pharmacyGstin').lean(),
    ]);
    if (!patient) throw ApiError.notFound('Patient not found');

    const isPharmacy    = input.category === 'pharmacy';
    const counterKey    = isPharmacy ? 'pharmacy_invoice' : 'invoice';
    const prefix        = isPharmacy
      ? ((clinic as any)?.settings?.pharmacyInvoicePrefix ?? 'PH')
      : ((clinic as any)?.settings?.invoicePrefix ?? 'INV');
    const seq           = await nextSeq(clinicId, counterKey);
    const year          = new Date().getFullYear();
    const invoiceNumber = `${prefix}-${year}-${String(seq).padStart(4, '0')}`;

    // Pharmacy invoices use pharmacyGstin unless caller explicitly provides clinicGstin
    const resolvedClinicGstin = input.clinicGstin
      ?? (isPharmacy ? (clinic as any)?.pharmacyGstin : undefined);

    const isInterState = input.isInterState ?? false;
    const computedItems = input.items.map((item) => computeItem(item, isInterState));
    const totals        = computeTotals(computedItems);

    const invoice = await Invoice.create({
      clinicId,
      patientId:          new Types.ObjectId(input.patientId),
      appointmentId:      input.appointmentId ? new Types.ObjectId(input.appointmentId) : undefined,
      invoiceNumber,
      category:           isPharmacy ? 'pharmacy' : 'clinic',
      invoiceDate:        new Date(),
      dueDate:            input.dueDate ? new Date(input.dueDate) : undefined,
      items:              computedItems,
      ...totals,
      paidAmount:         0,
      balanceAmount:      totals.totalAmount,
      paymentStatus:      'pending',
      payments:           [],
      isInterState,
      clinicGstin:        resolvedClinicGstin,
      patientGstin:       input.patientGstin,
      createdBy:          userId,
      notes:              input.notes,
      termsAndConditions: input.termsAndConditions,
    });

    if (input.appointmentId) {
      await Appointment.findByIdAndUpdate(input.appointmentId, { invoiceId: invoice._id });
    }

    // Pharmacy invoices: auto-deduct stock for medicine items linked to a drug
    if (isPharmacy) {
      const medicineItems = computedItems.filter(
        (it) => it.type === 'medicine' && it.referenceId
      );
      await Promise.allSettled(
        medicineItems.map((it) =>
          PharmacyService.stockOut(
            clinicId.toString(),
            it.referenceId!.toString(),
            { quantity: it.quantity, type: 'adjustment', notes: `Pharmacy invoice ${invoiceNumber}` },
            userId.toString()
          )
        )
      );
    }

    const created = await Invoice.findById(invoice._id)
      .populate('patientId', PATIENT_FIELDS)
      .populate('createdBy', CREATOR_FIELDS)
      .lean();
    return toResponse(created as Record<string, unknown> | null);
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
    if (params.category)      filter.category      = params.category;
    // Pharmacist sees only pharmacy invoices by default
    if (userRole === 'Pharmacist' && !params.category) filter.category = 'pharmacy';

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

    const transformed = data.map((d) => toResponse(d as Record<string, unknown>));
    return { data: transformed, total, page: params.page, limit: params.limit, totalPages, hasNext: params.page < totalPages, hasPrev: params.page > 1 };
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

  // ── Update (unpaid invoices only) ─────────────────────────────────────────

  static async updateInvoice(
    clinicId:  Types.ObjectId,
    id:        string,
    input:     UpdateInvoiceInput,
  ) {
    const inv = await Invoice.findOne({ _id: id, clinicId });
    if (!inv) throw ApiError.notFound('Invoice not found');
    if (inv.paidAmount > 0) throw ApiError.badRequest('Cannot edit an invoice with recorded payments');
    if (inv.isCancelled)    throw ApiError.badRequest('Cannot edit a cancelled invoice');

    const isInterState    = input.isInterState ?? inv.isInterState;
    const computedItems   = input.items.map((item) => computeItem(item, isInterState));
    const totals          = computeTotals(computedItems);

    inv.items              = computedItems as any;
    inv.isInterState       = isInterState;
    inv.subtotal           = totals.subtotal;
    inv.totalDiscount      = totals.totalDiscount;
    inv.totalTaxableAmount = totals.totalTaxableAmount;
    inv.totalCGST          = totals.totalCGST;
    inv.totalSGST          = totals.totalSGST;
    inv.totalIGST          = totals.totalIGST;
    inv.roundOff           = totals.roundOff;
    inv.totalAmount        = totals.totalAmount;
    inv.balanceAmount      = totals.totalAmount; // paidAmount is 0 (checked above)

    if (input.clinicGstin        !== undefined) inv.clinicGstin        = input.clinicGstin;
    if (input.patientGstin       !== undefined) inv.patientGstin       = input.patientGstin;
    if (input.notes              !== undefined) inv.notes              = input.notes;
    if (input.termsAndConditions !== undefined) inv.termsAndConditions = input.termsAndConditions;
    if (input.dueDate            !== undefined) inv.dueDate = input.dueDate ? new Date(input.dueDate) : undefined;

    await inv.save();

    const updated = await Invoice.findById(inv._id)
      .populate('patientId', PATIENT_FIELDS)
      .populate('createdBy', CREATOR_FIELDS)
      .lean();
    return toResponse(updated as Record<string, unknown> | null);
  }

  // ── Get single ────────────────────────────────────────────────────────────

  static async getInvoiceById(clinicId: Types.ObjectId, id: string) {
    const inv = await Invoice.findOne({ _id: id, clinicId })
      .populate('patientId', PATIENT_FIELDS)
      .populate('createdBy', CREATOR_FIELDS)
      .lean();
    if (!inv) throw ApiError.notFound('Invoice not found');
    return toResponse(inv as Record<string, unknown>);
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

    const updated = await Invoice.findById(inv._id)
      .populate('patientId', PATIENT_FIELDS)
      .populate('createdBy', CREATOR_FIELDS)
      .lean();
    return toResponse(updated as Record<string, unknown> | null);
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

    const cancelled = await Invoice.findById(inv._id)
      .populate('patientId', PATIENT_FIELDS)
      .populate('createdBy', CREATOR_FIELDS)
      .lean();
    return toResponse(cancelled as Record<string, unknown> | null);
  }

  // ── Day-end report ────────────────────────────────────────────────────────

  static async getDayEndReport(clinicId: Types.ObjectId, dateStr: string) {
    // dateStr is YYYY-MM-DD in IST; convert to UTC window
    const dayStart = new Date(`${dateStr}T00:00:00+05:30`);
    const dayEnd   = new Date(`${dateStr}T23:59:59.999+05:30`);

    const rows = await Invoice.aggregate([
      { $match: { clinicId, isDeleted: false, isCancelled: false } },
      { $unwind: '$payments' },
      { $match: { 'payments.paidAt': { $gte: dayStart, $lte: dayEnd } } },
      {
        $lookup: {
          from: 'patients', localField: 'patientId', foreignField: '_id', as: 'patientDoc',
        },
      },
      {
        $project: {
          invoiceNumber: 1,
          patientName:   { $arrayElemAt: ['$patientDoc.name', 0] },
          paidAt:        '$payments.paidAt',
          mode:          '$payments.mode',
          amount:        '$payments.amount',
          transactionId: '$payments.transactionId',
        },
      },
      { $sort: { paidAt: 1 } },
    ]);

    const byModeMap = new Map<string, { amount: number; count: number }>();
    let totalAmount = 0;
    for (const r of rows) {
      const prev = byModeMap.get(r.mode) ?? { amount: 0, count: 0 };
      byModeMap.set(r.mode, {
        amount: parseFloat((prev.amount + r.amount).toFixed(2)),
        count:  prev.count + 1,
      });
      totalAmount = parseFloat((totalAmount + r.amount).toFixed(2));
    }

    return {
      date:         dateStr,
      totalAmount,
      totalCount:   rows.length,
      byMode:       Array.from(byModeMap.entries()).map(([mode, v]) => ({ mode, ...v })),
      transactions: rows.map((r: any) => ({
        invoiceId:     r._id?.toString() ?? '',
        invoiceNumber: r.invoiceNumber,
        patientName:   r.patientName ?? 'Unknown',
        paidAt:        r.paidAt,
        mode:          r.mode,
        amount:        r.amount,
        transactionId: r.transactionId,
      })),
    };
  }

  // ── Revenue analytics ─────────────────────────────────────────────────────

  static async getAnalytics(clinicId: Types.ObjectId, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days + 1);
    since.setHours(0, 0, 0, 0);

    const [dailyRaw, byItemTypeRaw] = await Promise.all([
      Invoice.aggregate([
        { $match: { clinicId, isDeleted: false, isCancelled: false, invoiceDate: { $gte: since } } },
        { $group: {
          _id:     { $dateToString: { format: '%Y-%m-%d', date: '$invoiceDate', timezone: 'Asia/Kolkata' } },
          revenue: { $sum: '$totalAmount' },
          count:   { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
      ]),
      Invoice.aggregate([
        { $match: { clinicId, isDeleted: false, isCancelled: false, invoiceDate: { $gte: since } } },
        { $unwind: '$items' },
        { $group: {
          _id:     '$items.type',
          revenue: { $sum: '$items.totalAmount' },
          count:   { $sum: 1 },
        }},
        { $sort: { revenue: -1 } },
      ]),
    ]);

    // Fill all days including zeroes
    const trendMap = new Map<string, { revenue: number; count: number }>(
      dailyRaw.map((d: any) => [d._id, { revenue: d.revenue, count: d.count }])
    );
    const filledTrend: { date: string; revenue: number; count: number }[] = [];
    const cursor = new Date(since);
    const now    = new Date();
    while (cursor <= now) {
      const dateStr = cursor.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      filledTrend.push({ date: dateStr, ...(trendMap.get(dateStr) ?? { revenue: 0, count: 0 }) });
      cursor.setDate(cursor.getDate() + 1);
    }

    return {
      dailyTrend: filledTrend,
      byItemType: byItemTypeRaw.map((d: any) => ({ type: d._id as string, revenue: d.revenue as number, count: d.count as number })),
    };
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
