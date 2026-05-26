import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

export const env = {
  NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),

  MONGO_URI: requireEnv('MONGO_URI'),
  MONGO_DB_NAME: process.env.MONGO_DB_NAME || 'clinixindia',

  JWT_ACCESS_SECRET: requireEnv('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: requireEnv('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

  COOKIE_SECRET: requireEnv('COOKIE_SECRET'),

  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'noreply@clinixindia.com',

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || '',
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || '',

  // MSG91 — SMS & WhatsApp
  MSG91_AUTH_KEY:              process.env.MSG91_AUTH_KEY              || '',
  MSG91_SENDER_ID:             process.env.MSG91_SENDER_ID             || 'CLINIC',
  MSG91_WA_INTEGRATED_NUMBER:  process.env.MSG91_WA_INTEGRATED_NUMBER  || '',
  MSG91_FLOW_APPT_CONFIRM:     process.env.MSG91_FLOW_APPT_CONFIRM     || '',
  MSG91_FLOW_APPT_REMINDER:    process.env.MSG91_FLOW_APPT_REMINDER    || '',
  MSG91_FLOW_APPT_STATUS:      process.env.MSG91_FLOW_APPT_STATUS      || '',
  MSG91_FLOW_LAB_READY:        process.env.MSG91_FLOW_LAB_READY        || '',
  MSG91_WA_TPL_APPT_CONFIRM:   process.env.MSG91_WA_TPL_APPT_CONFIRM   || '',
  MSG91_WA_TPL_APPT_REMINDER:  process.env.MSG91_WA_TPL_APPT_REMINDER  || '',
  MSG91_WA_TPL_APPT_STATUS:    process.env.MSG91_WA_TPL_APPT_STATUS    || '',
  MSG91_WA_TPL_LAB_READY:          process.env.MSG91_WA_TPL_LAB_READY          || '',
  MSG91_FLOW_PAYMENT_RECEIPT:       process.env.MSG91_FLOW_PAYMENT_RECEIPT       || '',
  MSG91_FLOW_INVOICE_OVERDUE:       process.env.MSG91_FLOW_INVOICE_OVERDUE       || '',
  MSG91_WA_TPL_PAYMENT_RECEIPT:     process.env.MSG91_WA_TPL_PAYMENT_RECEIPT     || '',
  MSG91_WA_TPL_INVOICE_OVERDUE:     process.env.MSG91_WA_TPL_INVOICE_OVERDUE     || '',

  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),

  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
} as const;
