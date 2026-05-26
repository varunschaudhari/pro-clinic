import { Types } from 'mongoose';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { Clinic } from '../models/Clinic.model';
import { Msg91Service } from './msg91.service';
import {
  sendAppointmentConfirmedEmail,
  sendAppointmentReminderEmail,
  sendAppointmentStatusEmail,
  sendLabReadyEmail,
  sendPaymentReceiptEmail,
  sendInvoiceOverdueEmail,
} from '../utils/email';

// ── Helpers ───────────────────────────────────────────────────────────────────

export interface ClinicNotifySettings {
  enableSMS:      boolean;
  enableWhatsApp: boolean;
}

function formatDateIST(d: Date | string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata',
  }).format(new Date(d));
}

async function getClinicSettings(clinicId: Types.ObjectId): Promise<ClinicNotifySettings> {
  const clinic = await Clinic.findById(clinicId, 'settings').lean();
  return {
    enableSMS:      Boolean(clinic?.settings?.enableSMS),
    enableWhatsApp: Boolean(clinic?.settings?.enableWhatsApp),
  };
}

// Run fn async, log errors — never throws to caller
function fire(fn: () => Promise<void>, channel: string): void {
  fn().catch((e: Error) => logger.warn(`[notify:${channel}] ${e.message}`));
}

// ── Context shapes ────────────────────────────────────────────────────────────

interface PatientRef { name: string; mobile: string; email?: string }
interface DoctorRef  { name: string }

export interface ApptDoc {
  clinicId:          Types.ObjectId;
  patientId:         PatientRef;
  doctorId:          DoctorRef;
  appointmentDate:   Date;
  slotStart:         string;
  tokenDisplay:      string;
  cancellationReason?: string;
}

export interface LabDoc {
  clinicId:     Types.ObjectId;
  patientId:    PatientRef;
  testName:     string;
  reportNumber: string;
}

export interface InvoiceDocForNotify {
  clinicId:      Types.ObjectId;
  patientId:     PatientRef;
  invoiceNumber: string;
  totalAmount:   number;
  paidAmount:    number;
  balanceAmount: number;
  paymentStatus: string;
  dueDate?:      Date;
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

export class NotifyDispatch {

  // ── Appointment confirmed (fires on create) ────────────────────────────────

  static appointmentConfirmed(doc: ApptDoc): void {
    fire(async () => {
      const { enableSMS, enableWhatsApp } = await getClinicSettings(doc.clinicId);
      const p    = doc.patientId;
      const date = formatDateIST(doc.appointmentDate);
      const vars = { patient: p.name, doctor: doc.doctorId.name, date, time: doc.slotStart, token: doc.tokenDisplay };

      if (enableSMS && env.MSG91_FLOW_APPT_CONFIRM) {
        await Msg91Service.sendSms({ mobile: p.mobile, flowId: env.MSG91_FLOW_APPT_CONFIRM, variables: vars });
      }
      if (enableWhatsApp && env.MSG91_WA_TPL_APPT_CONFIRM) {
        await Msg91Service.sendWhatsApp({ mobile: p.mobile, templateName: env.MSG91_WA_TPL_APPT_CONFIRM, variables: [vars.patient, vars.doctor, vars.date, vars.time, vars.token] });
      }
      if (p.email) {
        await sendAppointmentConfirmedEmail(p.email, p.name, vars.doctor, date, vars.time, vars.token);
      }
    }, 'appt_confirm');
  }

  // ── Appointment reminder (called by cron job, uses pre-fetched settings) ──

  static appointmentReminder(doc: ApptDoc, settings: ClinicNotifySettings): void {
    fire(async () => {
      const p    = doc.patientId;
      const date = formatDateIST(doc.appointmentDate);
      const vars = { patient: p.name, doctor: doc.doctorId.name, date, time: doc.slotStart, token: doc.tokenDisplay };

      if (settings.enableSMS && env.MSG91_FLOW_APPT_REMINDER) {
        await Msg91Service.sendSms({ mobile: p.mobile, flowId: env.MSG91_FLOW_APPT_REMINDER, variables: vars });
      }
      if (settings.enableWhatsApp && env.MSG91_WA_TPL_APPT_REMINDER) {
        await Msg91Service.sendWhatsApp({ mobile: p.mobile, templateName: env.MSG91_WA_TPL_APPT_REMINDER, variables: [vars.patient, vars.doctor, vars.date, vars.time, vars.token] });
      }
      if (p.email) {
        await sendAppointmentReminderEmail(p.email, p.name, vars.doctor, date, vars.time, vars.token);
      }
    }, 'appt_reminder');
  }

  // ── Appointment status changed ─────────────────────────────────────────────

  static appointmentStatusChanged(doc: ApptDoc, newStatus: string): void {
    if (!['cancelled', 'completed', 'no_show'].includes(newStatus)) return;

    fire(async () => {
      const { enableSMS, enableWhatsApp } = await getClinicSettings(doc.clinicId);
      const p    = doc.patientId;
      const date = formatDateIST(doc.appointmentDate);
      const vars = { patient: p.name, status: newStatus, date, reason: doc.cancellationReason ?? '' };

      if (enableSMS && env.MSG91_FLOW_APPT_STATUS) {
        await Msg91Service.sendSms({ mobile: p.mobile, flowId: env.MSG91_FLOW_APPT_STATUS, variables: vars });
      }
      if (enableWhatsApp && env.MSG91_WA_TPL_APPT_STATUS) {
        await Msg91Service.sendWhatsApp({ mobile: p.mobile, templateName: env.MSG91_WA_TPL_APPT_STATUS, variables: [vars.patient, vars.status, vars.date, vars.reason].filter(Boolean) });
      }
      if (p.email) {
        await sendAppointmentStatusEmail(p.email, p.name, newStatus, date, doc.cancellationReason);
      }
    }, 'appt_status');
  }

  // ── Lab result ready ───────────────────────────────────────────────────────

  static labResultReady(doc: LabDoc): void {
    fire(async () => {
      const { enableSMS, enableWhatsApp } = await getClinicSettings(doc.clinicId);
      const p    = doc.patientId;
      const vars = { patient: p.name, test: doc.testName, report_no: doc.reportNumber };

      if (enableSMS && env.MSG91_FLOW_LAB_READY) {
        await Msg91Service.sendSms({ mobile: p.mobile, flowId: env.MSG91_FLOW_LAB_READY, variables: vars });
      }
      if (enableWhatsApp && env.MSG91_WA_TPL_LAB_READY) {
        await Msg91Service.sendWhatsApp({ mobile: p.mobile, templateName: env.MSG91_WA_TPL_LAB_READY, variables: [vars.patient, vars.test, vars.report_no] });
      }
      if (p.email) {
        await sendLabReadyEmail(p.email, p.name, doc.testName, doc.reportNumber);
      }
    }, 'lab_ready');
  }

  // ── Payment receipt ────────────────────────────────────────────────────────

  static paymentReceived(doc: InvoiceDocForNotify, amount: number, mode: string): void {
    fire(async () => {
      const { enableSMS, enableWhatsApp } = await getClinicSettings(doc.clinicId);
      const p    = doc.patientId;
      const vars = {
        patient:  p.name,
        invoice:  doc.invoiceNumber,
        amount:   `Rs ${amount.toFixed(2)}`,
        mode,
        balance:  `Rs ${doc.balanceAmount.toFixed(2)}`,
      };

      if (enableSMS && env.MSG91_FLOW_PAYMENT_RECEIPT) {
        await Msg91Service.sendSms({ mobile: p.mobile, flowId: env.MSG91_FLOW_PAYMENT_RECEIPT, variables: vars });
      }
      if (enableWhatsApp && env.MSG91_WA_TPL_PAYMENT_RECEIPT) {
        await Msg91Service.sendWhatsApp({ mobile: p.mobile, templateName: env.MSG91_WA_TPL_PAYMENT_RECEIPT, variables: [vars.patient, vars.invoice, vars.amount, vars.balance] });
      }
      if (p.email) {
        await sendPaymentReceiptEmail(p.email, p.name, doc.invoiceNumber, amount, mode, doc.balanceAmount);
      }
    }, 'payment_receipt');
  }

  // ── Invoice overdue reminder ───────────────────────────────────────────────

  static invoiceOverdue(doc: InvoiceDocForNotify, settings: ClinicNotifySettings): void {
    fire(async () => {
      const p    = doc.patientId;
      const vars = {
        patient:  p.name,
        invoice:  doc.invoiceNumber,
        amount:   `Rs ${doc.totalAmount.toFixed(2)}`,
        balance:  `Rs ${doc.balanceAmount.toFixed(2)}`,
      };

      if (settings.enableSMS && env.MSG91_FLOW_INVOICE_OVERDUE) {
        await Msg91Service.sendSms({ mobile: p.mobile, flowId: env.MSG91_FLOW_INVOICE_OVERDUE, variables: vars });
      }
      if (settings.enableWhatsApp && env.MSG91_WA_TPL_INVOICE_OVERDUE) {
        await Msg91Service.sendWhatsApp({ mobile: p.mobile, templateName: env.MSG91_WA_TPL_INVOICE_OVERDUE, variables: [vars.patient, vars.invoice, vars.balance] });
      }
      if (p.email && doc.dueDate) {
        await sendInvoiceOverdueEmail(p.email, p.name, doc.invoiceNumber, doc.totalAmount, doc.balanceAmount, doc.dueDate);
      }
    }, 'invoice_overdue');
  }
}
