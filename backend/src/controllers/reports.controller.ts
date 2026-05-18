import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Invoice } from '../models/Invoice.model';
import { Patient } from '../models/Patient.model';
import { Appointment } from '../models/Appointment.model';
import { PharmacyItem } from '../models/PharmacyItem.model';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDateRange(query: Record<string, string>): { from: Date; to: Date } {
  if (query.from && query.to) {
    return {
      from: new Date(query.from + 'T00:00:00'),
      to:   new Date(query.to   + 'T23:59:59.999'),
    };
  }
  const now    = new Date();
  const period = query.period ?? 'month';
  if (period === 'week') {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    return { from, to: now };
  }
  if (period === 'quarter') {
    const q    = Math.floor(now.getMonth() / 3);
    const from = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0, 0);
    return { from, to: now };
  }
  if (period === 'year') {
    return { from: new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0), to: now };
  }
  return { from: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0), to: now };
}

function last12MonthLabels(): string[] {
  const now    = new Date();
  const labels: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return labels;
}

function shortMonth(ym: string): string {
  return new Date(ym + '-01').toLocaleString('en-IN', { month: 'short', year: '2-digit' });
}

function round2(n: number) { return Math.round(n * 100) / 100; }

// ── Revenue ──────────────────────────────────────────────────────────────────

export const getRevenueReport = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = new Types.ObjectId(req.clinicId!);
  const { from, to } = getDateRange(req.query as Record<string, string>);

  const now12ago = new Date();
  now12ago.setMonth(now12ago.getMonth() - 11);
  now12ago.setDate(1);
  now12ago.setHours(0, 0, 0, 0);

  const [summaryAgg, trendAgg, modeAgg, servicesAgg] = await Promise.all([
    Invoice.aggregate([
      { $match: { clinicId, isCancelled: false, isDeleted: false, invoiceDate: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: null,
          totalBilled:      { $sum: '$totalAmount' },
          totalCollected:   { $sum: '$paidAmount' },
          totalOutstanding: { $sum: '$balanceAmount' },
          invoiceCount:     { $sum: 1 },
        },
      },
    ]),

    Invoice.aggregate([
      { $match: { clinicId, isCancelled: false, isDeleted: false, invoiceDate: { $gte: now12ago } } },
      {
        $group: {
          _id:       { $dateToString: { format: '%Y-%m', date: '$invoiceDate' } },
          billed:    { $sum: '$totalAmount' },
          collected: { $sum: '$paidAmount' },
          count:     { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    Invoice.aggregate([
      { $match: { clinicId, isCancelled: false, isDeleted: false, invoiceDate: { $gte: now12ago }, paidAmount: { $gt: 0 } } },
      { $unwind: '$payments' },
      {
        $group: {
          _id:    '$payments.mode',
          amount: { $sum: '$payments.amount' },
          count:  { $sum: 1 },
        },
      },
      { $sort: { amount: -1 } },
    ]),

    Invoice.aggregate([
      { $match: { clinicId, isCancelled: false, isDeleted: false, invoiceDate: { $gte: from, $lte: to } } },
      { $unwind: '$items' },
      {
        $group: {
          _id:     { description: '$items.description', type: '$items.type' },
          revenue: { $sum: '$items.totalAmount' },
          count:   { $sum: '$items.quantity' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const trendMap: Record<string, { billed: number; collected: number; count: number }> = {};
  for (const r of trendAgg) trendMap[r._id] = r;

  const monthlyTrend = last12MonthLabels().map((m) => ({
    month:     m,
    label:     shortMonth(m),
    billed:    round2(trendMap[m]?.billed    ?? 0),
    collected: round2(trendMap[m]?.collected ?? 0),
    count:     trendMap[m]?.count ?? 0,
  }));

  const s = summaryAgg[0] ?? {};
  return ApiResponse.success(res, {
    summary: {
      totalBilled:      round2(s.totalBilled      ?? 0),
      totalCollected:   round2(s.totalCollected   ?? 0),
      totalOutstanding: round2(s.totalOutstanding ?? 0),
      invoiceCount:     s.invoiceCount ?? 0,
    },
    monthlyTrend,
    byPaymentMode: modeAgg.map((m) => ({ mode: m._id, amount: round2(m.amount), count: m.count })),
    topServices:   servicesAgg.map((s) => ({
      description: s._id.description,
      type:        s._id.type,
      revenue:     round2(s.revenue),
      count:       s.count,
    })),
  });
});

// ── Patients ─────────────────────────────────────────────────────────────────

export const getPatientsReport = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = new Types.ObjectId(req.clinicId!);
  const { from, to } = getDateRange(req.query as Record<string, string>);

  const now12ago = new Date();
  now12ago.setMonth(now12ago.getMonth() - 11);
  now12ago.setDate(1);
  now12ago.setHours(0, 0, 0, 0);

  const [summaryAgg, trendAgg, genderAgg, doctorAgg] = await Promise.all([
    Patient.aggregate([
      { $match: { clinicId, isDeleted: false } },
      {
        $group: {
          _id:           null,
          total:         { $sum: 1 },
          newThisPeriod: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ['$createdAt', from] }, { $lte: ['$createdAt', to] }] },
                1, 0,
              ],
            },
          },
        },
      },
    ]),

    Patient.aggregate([
      { $match: { clinicId, isDeleted: false, createdAt: { $gte: now12ago } } },
      {
        $group: {
          _id:   { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    Patient.aggregate([
      { $match: { clinicId, isDeleted: false } },
      { $group: { _id: '$gender', count: { $sum: 1 } } },
    ]),

    Appointment.aggregate([
      { $match: { clinicId, isDeleted: false, appointmentDate: { $gte: from, $lte: to } } },
      {
        $group: {
          _id:            '$doctorId',
          appointments:   { $sum: 1 },
          uniquePatients: { $addToSet: '$patientId' },
          completed:      { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        },
      },
      {
        $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'doctor' },
      },
      { $unwind: { path: '$doctor', preserveNullAndEmptyArrays: true } },
      { $sort: { appointments: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const trendMap: Record<string, number> = {};
  for (const r of trendAgg) trendMap[r._id] = r.count;

  const monthlyNewPatients = last12MonthLabels().map((m) => ({
    month: m, label: shortMonth(m), count: trendMap[m] ?? 0,
  }));

  const s = summaryAgg[0] ?? {};
  return ApiResponse.success(res, {
    summary: {
      total:         s.total         ?? 0,
      newThisPeriod: s.newThisPeriod ?? 0,
    },
    monthlyNewPatients,
    byGender: genderAgg.map((g) => ({ gender: g._id as string, count: g.count as number })),
    byDoctor: doctorAgg.map((d) => ({
      doctorId:       String(d._id),
      name:           (d.doctor as any)?.name ?? 'Unknown',
      appointments:   d.appointments,
      uniquePatients: (d.uniquePatients as unknown[]).length,
      completed:      d.completed,
    })),
  });
});

// ── Appointments ─────────────────────────────────────────────────────────────

export const getAppointmentsReport = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = new Types.ObjectId(req.clinicId!);
  const { from, to } = getDateRange(req.query as Record<string, string>);

  const baseMatch = { clinicId, isDeleted: false, appointmentDate: { $gte: from, $lte: to } };

  const [summaryAgg, dailyAgg, statusAgg, visitTypeAgg, doctorAgg] = await Promise.all([
    Appointment.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id:       null,
          total:     { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        },
      },
    ]),

    Appointment.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id:       { $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' } },
          total:     { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    Appointment.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),

    Appointment.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$visitType', count: { $sum: 1 } } },
    ]),

    Appointment.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id:       '$doctorId',
          total:     { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        },
      },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'doctor' } },
      { $unwind: { path: '$doctor', preserveNullAndEmptyArrays: true } },
      { $sort: { total: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const s = summaryAgg[0] ?? { total: 0, completed: 0, cancelled: 0 };
  const completionRate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;

  return ApiResponse.success(res, {
    summary: { total: s.total, completed: s.completed, cancelled: s.cancelled, completionRate },
    dailyTrend: dailyAgg.map((d) => ({
      date:      d._id as string,
      label:     new Date(d._id as string).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      total:     d.total as number,
      completed: d.completed as number,
    })),
    byStatus:    statusAgg.map((s)   => ({ status: s._id    as string, count: s.count    as number })),
    byVisitType: visitTypeAgg.map((v) => ({ visitType: v._id as string, count: v.count   as number })),
    byDoctor:    doctorAgg.map((d)   => ({
      doctorId:  String(d._id),
      name:      (d.doctor as any)?.name ?? 'Unknown',
      total:     d.total     as number,
      completed: d.completed as number,
      cancelled: d.cancelled as number,
    })),
  });
});

// ── Inventory ─────────────────────────────────────────────────────────────────

export const getInventoryReport = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = new Types.ObjectId(req.clinicId!);
  const now      = new Date();
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const [statsAgg, categoryAgg, lowStockItems, nearExpiryAgg] = await Promise.all([
    PharmacyItem.aggregate([
      { $match: { clinicId, isDeleted: false, isActive: true } },
      {
        $group: {
          _id:             null,
          totalItems:      { $sum: 1 },
          totalValue:      { $sum: { $multiply: ['$currentStock', '$sellingPrice'] } },
          lowStockCount:   { $sum: { $cond: [{ $lte: ['$currentStock', '$reorderLevel'] }, 1, 0] } },
          outOfStockCount: { $sum: { $cond: [{ $eq:  ['$currentStock', 0]            }, 1, 0] } },
        },
      },
    ]),

    PharmacyItem.aggregate([
      { $match: { clinicId, isDeleted: false, isActive: true } },
      {
        $group: {
          _id:   '$category',
          count: { $sum: 1 },
          value: { $sum: { $multiply: ['$currentStock', '$sellingPrice'] } },
          units: { $sum: '$currentStock' },
        },
      },
      { $sort: { count: -1 } },
    ]),

    PharmacyItem.find({
      clinicId, isDeleted: false, isActive: true,
      $expr: { $lte: ['$currentStock', '$reorderLevel'] },
    })
      .select('name currentStock reorderLevel unit category')
      .sort({ currentStock: 1 })
      .limit(20)
      .lean(),

    PharmacyItem.aggregate([
      { $match: { clinicId, isDeleted: false, isActive: true } },
      { $unwind: '$batches' },
      { $match: { 'batches.expiryDate': { $gte: now, $lte: in60Days }, 'batches.quantity': { $gt: 0 } } },
      {
        $project: {
          name:        1,
          batchNumber: '$batches.batchNumber',
          expiryDate:  '$batches.expiryDate',
          quantity:    '$batches.quantity',
        },
      },
      { $sort: { expiryDate: 1 } },
      { $limit: 20 },
    ]),
  ]);

  const st = statsAgg[0] ?? {};
  return ApiResponse.success(res, {
    summary: {
      totalItems:      st.totalItems      ?? 0,
      totalValue:      round2(st.totalValue ?? 0),
      lowStockCount:   st.lowStockCount   ?? 0,
      outOfStockCount: st.outOfStockCount ?? 0,
      nearExpiryCount: nearExpiryAgg.length,
    },
    byCategory: categoryAgg.map((c) => ({
      category: c._id as string,
      count:    c.count as number,
      value:    round2(c.value as number),
      units:    c.units as number,
    })),
    lowStockItems,
    nearExpiryBatches: nearExpiryAgg.map((b: any) => ({
      _id:         String(b._id),
      name:        b.name,
      batchNumber: b.batchNumber,
      expiryDate:  b.expiryDate,
      quantity:    b.quantity,
    })),
  });
});

// ── Export (flat rows for CSV / PDF) ─────────────────────────────────────────

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const getExportReport = asyncHandler(async (req: Request, res: Response) => {
  const clinicId = new Types.ObjectId(req.clinicId!);
  const type     = (req.query.type as string) ?? 'revenue';
  const { from, to } = getDateRange(req.query as Record<string, string>);

  // ── Revenue / Invoices ────────────────────────────────────────────────────
  if (type === 'revenue') {
    const invoices = await Invoice.find({
      clinicId, isCancelled: false, isDeleted: false,
      invoiceDate: { $gte: from, $lte: to },
    })
      .populate('patientId', 'name mobile')
      .sort({ invoiceDate: 1 })
      .lean();

    const headers = [
      'Invoice #', 'Date', 'Patient', 'Mobile',
      'Subtotal (₹)', 'Discount (₹)', 'Taxable (₹)',
      'CGST (₹)', 'SGST (₹)', 'IGST (₹)',
      'Total (₹)', 'Paid (₹)', 'Balance (₹)',
      'Payment Mode', 'Status',
    ];

    const rows = invoices.map((inv) => [
      inv.invoiceNumber,
      fmtDate(inv.invoiceDate),
      (inv.patientId as any)?.name    ?? '',
      (inv.patientId as any)?.mobile  ?? '',
      inv.subtotal.toFixed(2),
      inv.totalDiscount.toFixed(2),
      inv.totalTaxableAmount.toFixed(2),
      inv.totalCGST.toFixed(2),
      inv.totalSGST.toFixed(2),
      inv.totalIGST.toFixed(2),
      inv.totalAmount.toFixed(2),
      inv.paidAmount.toFixed(2),
      inv.balanceAmount.toFixed(2),
      inv.payments.map((p) => p.mode).join(', ') || '—',
      inv.paymentStatus,
    ]);

    return ApiResponse.success(res, { type, headers, rows });
  }

  // ── Appointments ──────────────────────────────────────────────────────────
  if (type === 'appointments') {
    const appts = await Appointment.find({
      clinicId, isDeleted: false,
      appointmentDate: { $gte: from, $lte: to },
    })
      .populate('patientId', 'name mobile')
      .populate('doctorId',  'name')
      .sort({ appointmentDate: 1, slotStart: 1 })
      .lean();

    const headers = [
      'Token #', 'Date', 'Slot', 'Patient', 'Mobile',
      'Doctor', 'Mode', 'Visit Type', 'Status', 'Chief Complaint',
    ];

    const rows = appts.map((a) => [
      a.tokenDisplay,
      fmtDate(a.appointmentDate),
      a.slotStart ?? '',
      (a.patientId as any)?.name   ?? '',
      (a.patientId as any)?.mobile ?? '',
      (a.doctorId  as any)?.name   ?? '',
      a.mode,
      a.visitType,
      a.status,
      a.chiefComplaint ?? '',
    ]);

    return ApiResponse.success(res, { type, headers, rows });
  }

  // ── Patients ──────────────────────────────────────────────────────────────
  if (type === 'patients') {
    const patients = await Patient.find({ clinicId, isDeleted: false })
      .sort({ createdAt: 1 })
      .lean();

    const headers = [
      'Patient ID', 'Name', 'Mobile', 'Gender', 'Date of Birth',
      'Blood Group', 'Registration Date',
    ];

    const rows = patients.map((p) => [
      p.patientId,
      p.name,
      p.mobile,
      p.gender,
      p.dob ? fmtDate(p.dob) : '',
      p.bloodGroup ?? '',
      fmtDate(p.createdAt),
    ]);

    return ApiResponse.success(res, { type, headers, rows });
  }

  // ── Inventory ─────────────────────────────────────────────────────────────
  if (type === 'inventory') {
    const items = await PharmacyItem.find({ clinicId, isDeleted: false, isActive: true })
      .sort({ name: 1 })
      .lean();

    const headers = [
      'Name', 'Category', 'Current Stock', 'Reorder Level',
      'Unit', 'Selling Price (₹)', 'Stock Value (₹)', 'Low Stock?',
    ];

    const rows = items.map((item) => [
      item.name,
      item.category,
      item.currentStock,
      item.reorderLevel,
      item.unit,
      item.sellingPrice.toFixed(2),
      (item.currentStock * item.sellingPrice).toFixed(2),
      item.currentStock <= item.reorderLevel ? 'Yes' : 'No',
    ]);

    return ApiResponse.success(res, { type, headers, rows });
  }

  throw new ApiError(400, `Unknown export type: ${type}`);
});
