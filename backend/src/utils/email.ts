import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

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
