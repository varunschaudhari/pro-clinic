import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Appointment } from '../models/Appointment.model';
import { LabReport } from '../models/LabReport.model';
import { PharmacyItem } from '../models/PharmacyItem.model';
import { Invoice } from '../models/Invoice.model';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

const toDateStr = (d: Date) => d.toISOString().split('T')[0];

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const clinicId  = new Types.ObjectId(req.clinicId!);
  const isDoctor  = req.user?.role === 'Doctor';
  const doctorOid = isDoctor ? req.user!.userId : undefined;

  const now        = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  // Last 7 days (today inclusive)
  const sevenDaysAgo = new Date(todayStart);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    return toDateStr(d);
  });

  // Base appointment match — doctor-scoped when role is Doctor
  const apptBase: Record<string, any> = {
    clinicId,
    appointmentDate: { $gte: todayStart, $lte: todayEnd },
    isDeleted: false,
  };
  if (doctorOid) apptBase.doctorId = doctorOid;

  const [
    apptStats,
    pendingLab,
    stockStats,
    revenueStats,
    upcomingAppts,
    weeklyApptAgg,
    weeklyRevAgg,
    patientsSeenIds,
  ] = await Promise.all([
    // 1. Today's appointment counts grouped by status
    Appointment.aggregate([
      { $match: apptBase },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // 2. Pending lab reports (clinic-wide)
    LabReport.countDocuments({
      clinicId,
      status: { $in: ['ordered', 'sample_collected', 'processing'] },
      isDeleted: false,
    }),

    // 3. Low-stock + out-of-stock counts (clinic-wide)
    PharmacyItem.aggregate([
      { $match: { clinicId, isDeleted: false, isActive: true } },
      {
        $group: {
          _id: null,
          lowStockCount:  { $sum: { $cond: [{ $lte: ['$currentStock', '$reorderLevel'] }, 1, 0] } },
          outOfStockCount: { $sum: { $cond: [{ $eq: ['$currentStock', 0] }, 1, 0] } },
        },
      },
    ]),

    // 4. Revenue — this month and today (clinic-wide, not doctor-scoped)
    Invoice.aggregate([
      { $match: { clinicId, isCancelled: false, isDeleted: false } },
      {
        $group: {
          _id: null,
          monthRevenue: { $sum: { $cond: [{ $gte: ['$invoiceDate', monthStart] }, '$paidAmount', 0] } },
          todayRevenue: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ['$invoiceDate', todayStart] }, { $lte: ['$invoiceDate', todayEnd] }] },
                '$paidAmount',
                0,
              ],
            },
          },
          pendingBillsCount: { $sum: { $cond: [{ $gt: ['$balanceAmount', 0] }, 1, 0] } },
        },
      },
    ]),

    // 5. Upcoming appointments (doctor-scoped when Doctor role)
    Appointment.find({
      ...apptBase,
      status: { $nin: ['completed', 'cancelled'] },
    })
      .sort({ slotStart: 1 })
      .limit(6)
      .populate('patientId', 'name')
      .populate('doctorId', 'name')
      .lean(),

    // 6. Last 7 days appointment counts (doctor-scoped)
    Appointment.aggregate([
      {
        $match: {
          clinicId,
          ...(doctorOid ? { doctorId: doctorOid } : {}),
          appointmentDate: { $gte: sevenDaysAgo, $lte: todayEnd },
          status: { $ne: 'cancelled' },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate', timezone: 'Asia/Kolkata' } },
          count: { $sum: 1 },
        },
      },
    ]),

    // 7. Last 7 days revenue (clinic-wide)
    Invoice.aggregate([
      {
        $match: {
          clinicId,
          isCancelled: false,
          isDeleted: false,
          invoiceDate: { $gte: sevenDaysAgo, $lte: todayEnd },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$invoiceDate', timezone: 'Asia/Kolkata' } },
          revenue: { $sum: '$paidAmount' },
        },
      },
    ]),

    // 8. Distinct patients seen today (completed appointments, doctor-scoped)
    Appointment.distinct('patientId', {
      clinicId,
      ...(doctorOid ? { doctorId: doctorOid } : {}),
      appointmentDate: { $gte: todayStart, $lte: todayEnd },
      status: 'completed',
      isDeleted: false,
    }),
  ]);

  // Reshape appointment status breakdown
  const byStatus: Record<string, number> = {};
  let todayTotal = 0;
  for (const row of apptStats) {
    byStatus[row._id as string] = row.count;
    todayTotal += row.count;
  }

  const stock = stockStats[0]  ?? { lowStockCount: 0, outOfStockCount: 0 };
  const rev   = revenueStats[0] ?? { monthRevenue: 0, todayRevenue: 0, pendingBillsCount: 0 };

  // Fill in 0s for missing days
  const apptByDay  = Object.fromEntries(weeklyApptAgg.map((r: any) => [r._id, r.count]));
  const revByDay   = Object.fromEntries(weeklyRevAgg.map((r: any)  => [r._id, Math.round(r.revenue * 100) / 100]));

  return ApiResponse.success(res, {
    todayAppointments: {
      total:      todayTotal,
      scheduled:  byStatus['scheduled']   ?? 0,
      confirmed:  byStatus['confirmed']   ?? 0,
      inProgress: byStatus['in_progress'] ?? 0,
      completed:  byStatus['completed']   ?? 0,
      cancelled:  byStatus['cancelled']   ?? 0,
    },
    patientsSeenToday:  patientsSeenIds.length,
    pendingLabReports:  pendingLab,
    lowStockCount:      stock.lowStockCount,
    outOfStockCount:    stock.outOfStockCount,
    monthRevenue:       Math.round(rev.monthRevenue * 100) / 100,
    todayRevenue:       Math.round(rev.todayRevenue * 100) / 100,
    pendingBillsCount:  rev.pendingBillsCount,
    weeklyAppointments: last7.map((date) => ({ date, count: apptByDay[date] ?? 0 })),
    weeklyRevenue:      last7.map((date) => ({ date, revenue: revByDay[date] ?? 0 })),
    upcomingAppointments: (upcomingAppts as any[]).map((a) => ({
      _id:          String(a._id),
      tokenDisplay: a.tokenDisplay,
      slotStart:    a.slotStart,
      status:       a.status,
      patient:      { name: a.patientId?.name ?? 'Unknown' },
      doctor:       { name: a.doctorId?.name  ?? 'Unknown' },
    })),
  });
});
