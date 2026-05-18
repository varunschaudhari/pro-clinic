import { Types } from 'mongoose';
import { Notification, type NotificationType, type NotificationSeverity } from '../models/Notification.model';
import { PharmacyItem }  from '../models/PharmacyItem.model';
import { LabReport }     from '../models/LabReport.model';
import { Invoice }       from '../models/Invoice.model';
import { Appointment }   from '../models/Appointment.model';
import { ROLES, type Role } from '../constants';

// ── Alert definition ───────────────────────────────────────────────────────────

interface AlertDef {
  type:        NotificationType;
  title:       string;
  message:     string;
  count:       number;
  entityIds:   Types.ObjectId[];
  targetRoles: Role[];
  severity:    NotificationSeverity;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const plural = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;

function todayStartUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class NotificationService {

  /**
   * Runs all aggregations, upserts one Notification record per alert type,
   * then returns all active (unresolved) notifications visible to the caller's role.
   *
   * Rules:
   * - count 0→resolved  : mark isResolved, keep readBy (record stays for history)
   * - count X→Y (X>0)   : update count/message, clear readBy so users are re-alerted
   * - resolved→count>0  : set isResolved=false, reset readBy (fresh alert)
   */
  static async generateAndFetch(clinicId: string, userId: string, userRole: string) {
    const cid = new Types.ObjectId(clinicId);
    const ago24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const ago3d  = new Date(Date.now() - 3  * 24 * 60 * 60 * 1000);

    const [lowStockDrugs, outOfStockDrugs, pendingLabs, pendingBills, missedAppts] =
      await Promise.all([
        // Low stock: stock > 0 but <= reorderLevel
        PharmacyItem.find({
          clinicId: cid, isDeleted: false, isActive: true,
          $expr: { $and: [{ $gt: ['$currentStock', 0] }, { $lte: ['$currentStock', '$reorderLevel'] }] },
        }).select('_id').lean(),

        // Out of stock: stock === 0
        PharmacyItem.find({
          clinicId: cid, isDeleted: false, isActive: true, currentStock: 0,
        }).select('_id').lean(),

        // Pending lab reports older than 24 hours
        LabReport.find({
          clinicId: cid, isDeleted: false,
          status: { $in: ['ordered', 'sample_collected', 'processing'] },
          createdAt: { $lt: ago24h },
        }).select('_id').lean(),

        // Invoices with outstanding balance older than 3 days
        Invoice.find({
          clinicId: cid, isDeleted: false, isCancelled: false,
          balanceAmount: { $gt: 0 },
          invoiceDate: { $lt: ago3d },
        }).select('_id').lean(),

        // Past-due appointments (scheduled/confirmed but date has passed)
        Appointment.find({
          clinicId: cid, isDeleted: false,
          status: { $in: ['scheduled', 'confirmed'] },
          appointmentDate: { $lt: todayStartUTC() },
        }).select('_id').lean(),
      ]);

    const defs: AlertDef[] = [
      {
        type:        'low_stock',
        title:       'Low Stock Alert',
        message:     `${plural(lowStockDrugs.length, 'drug is', 'drugs are')} running low on stock`,
        count:       lowStockDrugs.length,
        entityIds:   lowStockDrugs.map((d) => d._id as Types.ObjectId),
        targetRoles: [ROLES.CLINIC_ADMIN, ROLES.PHARMACIST],
        severity:    'warning',
      },
      {
        type:        'out_of_stock',
        title:       'Out of Stock',
        message:     `${plural(outOfStockDrugs.length, 'drug is', 'drugs are')} out of stock`,
        count:       outOfStockDrugs.length,
        entityIds:   outOfStockDrugs.map((d) => d._id as Types.ObjectId),
        targetRoles: [ROLES.CLINIC_ADMIN, ROLES.PHARMACIST],
        severity:    'critical',
      },
      {
        type:        'pending_lab',
        title:       'Pending Lab Reports',
        message:     `${plural(pendingLabs.length, 'lab report has', 'lab reports have')} been pending for over 24 hours`,
        count:       pendingLabs.length,
        entityIds:   pendingLabs.map((l) => l._id as Types.ObjectId),
        targetRoles: [ROLES.CLINIC_ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST],
        severity:    'warning',
      },
      {
        type:        'pending_bill',
        title:       'Outstanding Invoices',
        message:     `${plural(pendingBills.length, 'invoice has', 'invoices have')} an outstanding balance`,
        count:       pendingBills.length,
        entityIds:   pendingBills.map((i) => i._id as Types.ObjectId),
        targetRoles: [ROLES.CLINIC_ADMIN, ROLES.RECEPTIONIST],
        severity:    'info',
      },
      {
        type:        'missed_appointment',
        title:       'Missed Appointments',
        message:     `${plural(missedAppts.length, 'appointment was', 'appointments were')} not attended`,
        count:       missedAppts.length,
        entityIds:   missedAppts.map((a) => a._id as Types.ObjectId),
        targetRoles: [ROLES.CLINIC_ADMIN, ROLES.RECEPTIONIST, ROLES.DOCTOR],
        severity:    'warning',
      },
    ];

    // Upsert each alert type
    await Promise.all(defs.map((def) => NotificationService.upsertAlert(cid, def)));

    // Return active notifications for this user's role
    return Notification.find({
      clinicId:    cid,
      isResolved:  false,
      count:       { $gt: 0 },
      targetRoles: { $in: [userRole] },
    }).sort({ severity: -1, updatedAt: -1 }).lean();
  }

  /** Unread count for a user (fast — no aggregation, just count query) */
  static async getUnreadCount(clinicId: string, userId: string, userRole: string): Promise<number> {
    const cid = new Types.ObjectId(clinicId);
    const uid = new Types.ObjectId(userId);
    return Notification.countDocuments({
      clinicId:    cid,
      isResolved:  false,
      count:       { $gt: 0 },
      targetRoles: { $in: [userRole] },
      readBy:      { $nin: [uid] },
    });
  }

  /** Mark a single notification as read by the current user */
  static async markRead(clinicId: string, notificationId: string, userId: string) {
    const uid = new Types.ObjectId(userId);
    await Notification.updateOne(
      { _id: new Types.ObjectId(notificationId), clinicId: new Types.ObjectId(clinicId) },
      { $addToSet: { readBy: uid } }
    );
  }

  /** Mark all visible notifications as read for this user */
  static async markAllRead(clinicId: string, userId: string, userRole: string) {
    const cid = new Types.ObjectId(clinicId);
    const uid = new Types.ObjectId(userId);
    await Notification.updateMany(
      { clinicId: cid, isResolved: false, targetRoles: { $in: [userRole] } },
      { $addToSet: { readBy: uid } }
    );
  }

  // ── Internal helpers ─────────────────────────────────────────────────────────

  private static async upsertAlert(clinicId: Types.ObjectId, def: AlertDef) {
    const existing = await Notification.findOne({ clinicId, type: def.type });

    if (def.count > 0) {
      if (!existing || existing.isResolved) {
        // New or re-activated alert — clear readBy
        await Notification.updateOne(
          { clinicId, type: def.type },
          {
            $set: {
              title:       def.title,
              message:     def.message,
              count:       def.count,
              entityIds:   def.entityIds,
              targetRoles: def.targetRoles,
              severity:    def.severity,
              isResolved:  false,
              resolvedAt:  undefined,
              readBy:      [],
            },
          },
          { upsert: true }
        );
      } else if (existing.count !== def.count) {
        // Count changed — update and clear readBy so users are re-alerted
        await Notification.updateOne(
          { clinicId, type: def.type },
          {
            $set: {
              message:  def.message,
              count:    def.count,
              entityIds: def.entityIds,
              readBy:   [],
            },
          }
        );
      }
      // count unchanged and not resolved → no-op (users' read state preserved)
    } else if (existing && !existing.isResolved) {
      // Condition cleared — mark resolved
      await Notification.updateOne(
        { clinicId, type: def.type },
        { $set: { isResolved: true, resolvedAt: new Date(), count: 0 } }
      );
    }
  }
}
