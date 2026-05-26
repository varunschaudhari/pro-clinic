import cron from 'node-cron';
import { Appointment } from '../models/Appointment.model';
import { Clinic } from '../models/Clinic.model';
import { NotifyDispatch } from '../services/notifyDispatch.service';
import { logger } from '../config/logger';

// ── Time helpers ──────────────────────────────────────────────────────────────

function toISTDateAndSlot(date: Date): { dateStr: string; slotStr: string } {
  const dateStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);

  const slotStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);

  return { dateStr, slotStr };
}

function shiftHHMM(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total  = Math.max(0, Math.min(23 * 60 + 59, h * 60 + m + minutes));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// ── Core job ──────────────────────────────────────────────────────────────────

const WINDOW_MINUTES = 45; // ±45 min around target slot → 90-min coverage per hourly run
const PATIENT_FIELDS = 'patientId name mobile email smsOptIn';
const DOCTOR_FIELDS  = 'name';

async function runReminderJob(): Promise<void> {
  const now = new Date();

  // Fetch all active clinics in one query
  const clinics = await Clinic.find({ isActive: true })
    .select('settings')
    .lean();

  for (const clinic of clinics) {
    const settings = clinic.settings as {
      enableSMS:         boolean;
      enableWhatsApp:    boolean;
      reminderLeadHours: number;
    };

    // Skip clinics with no notification channels enabled
    if (!settings.enableSMS && !settings.enableWhatsApp) continue;

    const leadHours = settings.reminderLeadHours ?? 24;

    // Compute target appointment time: now + leadHours (still in UTC, convert to IST for date/slot)
    const targetUTC = new Date(now.getTime() + leadHours * 60 * 60 * 1000);
    const { dateStr, slotStr: targetSlot } = toISTDateAndSlot(targetUTC);

    const slotMin = shiftHHMM(targetSlot, -WINDOW_MINUTES);
    const slotMax = shiftHHMM(targetSlot,  WINDOW_MINUTES);

    // Find unsent reminders in the slot window for this clinic
    const appointments = await Appointment.find({
      clinicId:        clinic._id,
      appointmentDate: new Date(`${dateStr}T00:00:00.000Z`),
      slotStart:       { $gte: slotMin, $lte: slotMax },
      status:          { $in: ['scheduled', 'confirmed'] },
      reminderSent:    false,
      isDeleted:       false,
    })
      .populate('patientId', PATIENT_FIELDS)
      .populate('doctorId',  DOCTOR_FIELDS)
      .lean();

    if (appointments.length === 0) continue;

    logger.info(
      `[reminder-job] Clinic ${clinic._id}: ${appointments.length} reminders ` +
      `(lead=${leadHours}h, slot ${slotMin}–${slotMax} on ${dateStr})`
    );

    const sentIds: string[] = [];

    for (const appt of appointments) {
      const patient = appt.patientId as any;

      // Respect patient opt-out (default opt-in if field not set on older records)
      if (patient?.smsOptIn === false) {
        logger.debug(`[reminder-job] Skipping patient ${patient._id} — smsOptIn=false`);
        continue;
      }

      NotifyDispatch.appointmentReminder(appt as any, {
        enableSMS:      Boolean(settings.enableSMS),
        enableWhatsApp: Boolean(settings.enableWhatsApp),
      });

      sentIds.push((appt._id as any).toString());
    }

    // Bulk-mark as sent to prevent duplicate dispatch on next cron run
    if (sentIds.length > 0) {
      await Appointment.updateMany(
        { _id: { $in: sentIds } },
        { $set: { reminderSent: true } }
      );
      logger.info(`[reminder-job] Marked ${sentIds.length} appointments reminderSent=true`);
    }
  }
}

// ── Schedule ──────────────────────────────────────────────────────────────────

export function startAppointmentReminderJob(): void {
  // Runs every hour at :00 minutes (UTC)
  cron.schedule('0 * * * *', () => {
    runReminderJob().catch((e: Error) =>
      logger.error(`[reminder-job] Unhandled error: ${e.message}`)
    );
  }, { timezone: 'UTC' });

  logger.info('[reminder-job] Hourly appointment reminder cron scheduled');
}
