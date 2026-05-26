import cron from 'node-cron';
import { Invoice } from '../models/Invoice.model';
import { Clinic } from '../models/Clinic.model';
import { NotifyDispatch } from '../services/notifyDispatch.service';
import { logger } from '../config/logger';

async function runOverdueReminderJob(): Promise<void> {
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const overdueInvoices = await Invoice.find({
    isDeleted:     false,
    isCancelled:   false,
    paymentStatus: { $ne: 'paid' },
    dueDate:       { $lt: startOfToday },
    $or: [
      { overdueReminderSentAt: { $exists: false } },
      { overdueReminderSentAt: null },
      { overdueReminderSentAt: { $lt: startOfToday } },
    ],
  })
    .populate('patientId', 'name mobile email')
    .lean();

  if (overdueInvoices.length === 0) {
    logger.info('[overdue-job] No overdue invoices to notify');
    return;
  }

  logger.info(`[overdue-job] Found ${overdueInvoices.length} overdue invoices`);

  // Group by clinic to fetch settings once per clinic
  const byClinic = new Map<string, typeof overdueInvoices>();
  for (const inv of overdueInvoices) {
    const key = inv.clinicId.toString();
    if (!byClinic.has(key)) byClinic.set(key, []);
    byClinic.get(key)!.push(inv);
  }

  const notifiedIds: string[] = [];

  for (const [clinicId, invoices] of byClinic) {
    const clinic = await Clinic.findById(clinicId, 'settings').lean();
    const settings = {
      enableSMS:      Boolean(clinic?.settings?.enableSMS),
      enableWhatsApp: Boolean(clinic?.settings?.enableWhatsApp),
    };

    for (const inv of invoices) {
      const patient = inv.patientId as any;
      if (!patient?.mobile) continue;

      NotifyDispatch.invoiceOverdue(
        {
          clinicId:      inv.clinicId,
          patientId:     { name: patient.name, mobile: patient.mobile, email: patient.email },
          invoiceNumber: inv.invoiceNumber,
          totalAmount:   inv.totalAmount,
          paidAmount:    inv.paidAmount,
          balanceAmount: inv.balanceAmount,
          paymentStatus: inv.paymentStatus,
          dueDate:       inv.dueDate,
        },
        settings
      );
      notifiedIds.push((inv._id as any).toString());
    }
  }

  if (notifiedIds.length > 0) {
    await Invoice.updateMany(
      { _id: { $in: notifiedIds } },
      { $set: { overdueReminderSentAt: now } }
    );
    logger.info(`[overdue-job] Dispatched reminders for ${notifiedIds.length} invoices`);
  }
}

export function startOverdueInvoiceReminderJob(): void {
  // 9am IST = 3:30 UTC
  cron.schedule('30 3 * * *', () => {
    runOverdueReminderJob().catch((e: Error) =>
      logger.error(`[overdue-job] Unhandled error: ${e.message}`)
    );
  }, { timezone: 'UTC' });

  logger.info('[overdue-job] Daily overdue invoice reminder cron scheduled (09:00 IST)');
}
