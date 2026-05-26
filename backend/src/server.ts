import app from './app';
import { connectDB } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';
import { startAppointmentReminderJob } from './jobs/appointmentReminder.job';
import { startOverdueInvoiceReminderJob } from './jobs/overdueInvoiceReminder.job';

const start = async () => {
  await connectDB();
  startAppointmentReminderJob();
  startOverdueInvoiceReminderJob();

  const server = app.listen(env.PORT, () => {
    logger.info(`ClinixIndia API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000); // Force exit after 10s
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection:', reason);
    server.close(() => process.exit(1));
  });
};

start();
