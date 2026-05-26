import nodemailer from 'nodemailer';
import { env } from '../config/env';

const BRAND_COLOR = '#0d9488';
const BRAND_NAME  = 'ClinixIndia';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

function emailShell(body: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;color:#1a1a1a;">
      <div style="background:${BRAND_COLOR};padding:20px 24px;border-radius:8px 8px 0 0;">
        <span style="color:#fff;font-size:20px;font-weight:700;">${BRAND_NAME}</span>
      </div>
      <div style="background:#fff;padding:28px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
        ${body}
      </div>
      <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:14px;">
        © ${new Date().getFullYear()} ${BRAND_NAME} · Made for Indian clinics
      </p>
    </div>`;
}

export async function sendAppointmentConfirmedEmail(
  to: string,
  patientName: string,
  doctorName: string,
  date: string,
  time: string,
  token: string
): Promise<void> {
  if (!env.SMTP_USER) return;
  await transporter.sendMail({
    from:    env.SMTP_FROM,
    to,
    subject: `Appointment Confirmed — ${date}`,
    html: emailShell(`
      <h2 style="margin:0 0 12px;font-size:18px;">Appointment Confirmed ✓</h2>
      <p style="color:#4b5563;line-height:1.6;margin:0 0 20px;">Dear <strong>${patientName}</strong>,</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:120px;">Doctor</td><td style="padding:8px 0;font-weight:600;">Dr. ${doctorName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Date</td><td style="padding:8px 0;font-weight:600;">${date}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Time</td><td style="padding:8px 0;font-weight:600;">${time}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Token</td>
            <td style="padding:8px 0;"><span style="background:${BRAND_COLOR};color:#fff;padding:2px 10px;border-radius:999px;font-weight:700;">${token}</span></td></tr>
      </table>
      <p style="color:#6b7280;font-size:13px;margin:0;">Please arrive 10 minutes early. Carry a valid ID and previous prescriptions if any.</p>
    `),
  });
}

export async function sendAppointmentReminderEmail(
  to: string,
  patientName: string,
  doctorName: string,
  date: string,
  time: string,
  token: string
): Promise<void> {
  if (!env.SMTP_USER) return;
  await transporter.sendMail({
    from:    env.SMTP_FROM,
    to,
    subject: `Reminder: Appointment Tomorrow — ${date}`,
    html: emailShell(`
      <h2 style="margin:0 0 12px;font-size:18px;">Appointment Reminder 🔔</h2>
      <p style="color:#4b5563;line-height:1.6;margin:0 0 20px;">Dear <strong>${patientName}</strong>, this is a reminder for your appointment <strong>tomorrow</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:120px;">Doctor</td><td style="padding:8px 0;font-weight:600;">Dr. ${doctorName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Date</td><td style="padding:8px 0;font-weight:600;">${date}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Time</td><td style="padding:8px 0;font-weight:600;">${time}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Token</td>
            <td style="padding:8px 0;"><span style="background:${BRAND_COLOR};color:#fff;padding:2px 10px;border-radius:999px;font-weight:700;">${token}</span></td></tr>
      </table>
      <p style="color:#6b7280;font-size:13px;margin:0;">Please arrive 10 minutes early and bring any relevant medical records.</p>
    `),
  });
}

export async function sendAppointmentStatusEmail(
  to: string,
  patientName: string,
  status: string,
  date: string,
  reason?: string
): Promise<void> {
  if (!env.SMTP_USER) return;
  const statusLabel = status === 'cancelled' ? 'Cancelled ✗' : status === 'completed' ? 'Completed ✓' : status === 'no_show' ? 'Marked No-Show' : status;
  await transporter.sendMail({
    from:    env.SMTP_FROM,
    to,
    subject: `Appointment ${statusLabel} — ${date}`,
    html: emailShell(`
      <h2 style="margin:0 0 12px;font-size:18px;">Appointment ${statusLabel}</h2>
      <p style="color:#4b5563;line-height:1.6;margin:0 0 16px;">Dear <strong>${patientName}</strong>, your appointment on <strong>${date}</strong> has been <strong>${status}</strong>.</p>
      ${reason ? `<p style="color:#ef4444;font-size:14px;margin:0 0 16px;">Reason: ${reason}</p>` : ''}
      <p style="color:#6b7280;font-size:13px;margin:0;">If you have questions, please contact the clinic directly.</p>
    `),
  });
}

export async function sendLabReadyEmail(
  to: string,
  patientName: string,
  testName: string,
  reportNumber: string
): Promise<void> {
  if (!env.SMTP_USER) return;
  await transporter.sendMail({
    from:    env.SMTP_FROM,
    to,
    subject: `Lab Report Ready — ${testName}`,
    html: emailShell(`
      <h2 style="margin:0 0 12px;font-size:18px;">Your Lab Report is Ready 🧪</h2>
      <p style="color:#4b5563;line-height:1.6;margin:0 0 20px;">Dear <strong>${patientName}</strong>, your lab report is now available.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:120px;">Test</td><td style="padding:8px 0;font-weight:600;">${testName}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Report #</td><td style="padding:8px 0;font-weight:600;">${reportNumber}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:13px;margin:0;">Please contact the clinic or log in to the patient portal to view your report.</p>
    `),
  });
}

export async function sendPaymentReceiptEmail(
  to: string,
  patientName: string,
  invoiceNumber: string,
  amount: number,
  mode: string,
  balance: number,
): Promise<void> {
  if (!env.SMTP_USER) return;
  const modeLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: `Payment Received — ${invoiceNumber}`,
    html: emailShell(`
      <h2 style="margin:0 0 12px;font-size:18px;">Payment Received ✓</h2>
      <p style="color:#4b5563;line-height:1.6;margin:0 0 20px;">Dear <strong>${patientName}</strong>, we have received your payment.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:140px;">Invoice</td><td style="padding:8px 0;font-weight:600;font-family:monospace;">${invoiceNumber}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Amount Paid</td><td style="padding:8px 0;font-weight:600;color:#16a34a;">₹${amount.toFixed(2)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Payment Mode</td><td style="padding:8px 0;">${modeLabel}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Balance Due</td>
            <td style="padding:8px 0;font-weight:600;${balance > 0 ? 'color:#dc2626;' : 'color:#16a34a;'}">
              ${balance > 0 ? `₹${balance.toFixed(2)}` : 'Fully Paid'}
            </td></tr>
      </table>
      <p style="color:#6b7280;font-size:13px;margin:0;">Thank you for your payment. Please retain this receipt for your records.</p>
    `),
  });
}

export async function sendInvoiceOverdueEmail(
  to: string,
  patientName: string,
  invoiceNumber: string,
  totalAmount: number,
  balance: number,
  dueDate: Date,
): Promise<void> {
  if (!env.SMTP_USER) return;
  const dueDateStr = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(dueDate);
  const daysLate   = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: `Payment Overdue — ${invoiceNumber}`,
    html: emailShell(`
      <h2 style="margin:0 0 12px;font-size:18px;">Payment Overdue ⚠️</h2>
      <p style="color:#4b5563;line-height:1.6;margin:0 0 20px;">Dear <strong>${patientName}</strong>, your payment is <strong style="color:#dc2626;">${daysLate} day${daysLate !== 1 ? 's' : ''} overdue</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tr><td style="padding:8px 0;color:#6b7280;width:140px;">Invoice</td><td style="padding:8px 0;font-weight:600;font-family:monospace;">${invoiceNumber}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Total Amount</td><td style="padding:8px 0;font-weight:600;">₹${totalAmount.toFixed(2)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Balance Due</td><td style="padding:8px 0;font-weight:600;color:#dc2626;">₹${balance.toFixed(2)}</td></tr>
        <tr><td style="padding:8px 0;color:#6b7280;">Due Date</td><td style="padding:8px 0;">${dueDateStr}</td></tr>
      </table>
      <p style="color:#6b7280;font-size:13px;margin:0;">Please clear the outstanding balance at the earliest. Contact us if you have any questions.</p>
    `),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  name: string
): Promise<void> {
  await transporter.sendMail({
    from: `"ClinixIndia" <${env.SMTP_FROM}>`,
    to,
    subject: 'Reset your ClinixIndia password',
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #0d9488; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <span style="color: white; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">ClinixIndia</span>
        </div>
        <div style="background: #fff; padding: 32px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600;">Reset your password</h2>
          <p style="margin: 0 0 8px; color: #4b5563; line-height: 1.6;">Hello ${name},</p>
          <p style="margin: 0 0 24px; color: #4b5563; line-height: 1.6;">
            We received a request to reset your ClinixIndia password.
            Click the button below to set a new password:
          </p>
          <a href="${resetUrl}"
             style="display: inline-block; background: #0d9488; color: white; padding: 12px 28px;
                    border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Reset Password
          </a>
          <p style="margin: 24px 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
            This link expires in <strong>1 hour</strong>.<br>
            If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">
          © ${new Date().getFullYear()} ClinixIndia · Made for Indian clinics
        </p>
      </div>
    `,
  });
}
