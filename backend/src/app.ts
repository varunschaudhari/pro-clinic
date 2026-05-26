import path from 'path';
import fs from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';

import { env } from './config/env';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import patientRoutes from './routes/patient.routes';
import appointmentRoutes from './routes/appointment.routes';
import prescriptionRoutes from './routes/prescription.routes';
import invoiceRoutes from './routes/invoice.routes';
import labRoutes from './routes/labReport.routes';
import pharmacyRoutes from './routes/pharmacy.routes';
import clinicRoutes from './routes/clinic.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportsRoutes from './routes/reports.routes';
import vitalsRoutes from './routes/vitals.routes';
import scheduleRoutes             from './routes/schedule.routes';
import notificationRoutes         from './routes/notification.routes';
import prescriptionTemplateRoutes from './routes/prescriptionTemplate.routes';
import portalRoutes                from './routes/portal.routes';
import auditRoutes                 from './routes/audit.routes';
import superadminRoutes            from './routes/superadmin.routes';
import bookingRoutes               from './routes/booking.routes';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const app = express();

// Security headers
app.use(helmet());

// CORS — allow only the configured client origin
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Clinic-Id', 'X-Request-Id'],
  })
);

// Global rate limiter — skipped in development to avoid false throttling during testing
if (env.NODE_ENV !== 'development') {
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests. Please try again later.' },
    })
  );
}

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(env.COOKIE_SECRET));
app.use(mongoSanitize()); // Prevents MongoDB operator injection

app.use(requestLogger);

// Static file serving for uploads (no auth — URLs are unguessable by clinic/report IDs)
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '1d' }));

// Health check (no auth needed)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/prescriptions', prescriptionRoutes);
app.use('/api/v1/billing', invoiceRoutes);
app.use('/api/v1/lab', labRoutes);
app.use('/api/v1/pharmacy', pharmacyRoutes);
app.use('/api/v1/settings', clinicRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/reports',   reportsRoutes);
app.use('/api/v1/vitals',    vitalsRoutes);
app.use('/api/v1/schedule',                scheduleRoutes);
app.use('/api/v1/notifications',           notificationRoutes);
app.use('/api/v1/prescription-templates',  prescriptionTemplateRoutes);
app.use('/api/v1/portal',                  portalRoutes);
app.use('/api/v1/audit-logs',              auditRoutes);
app.use('/api/v1/superadmin',             superadminRoutes);
app.use('/api/v1/booking',               bookingRoutes);
// Future modules:
// app.use('/api/v1/prescriptions', prescriptionRoutes);
// app.use('/api/v1/billing', billingRoutes);
// app.use('/api/v1/pharmacy', pharmacyRoutes);
// app.use('/api/v1/lab', labRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
