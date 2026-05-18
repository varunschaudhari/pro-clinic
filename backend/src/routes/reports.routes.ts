import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import {
  getRevenueReport,
  getPatientsReport,
  getAppointmentsReport,
  getInventoryReport,
  getExportReport,
} from '../controllers/reports.controller';

const router = Router();
router.use(authenticate, tenantResolver);

// Revenue & billing — ClinicAdmin + Receptionist only
router.get('/revenue',      roleGuard('ClinicAdmin', 'Receptionist'), getRevenueReport);

// Clinical reports — ClinicAdmin + Doctor
router.get('/patients',     roleGuard('ClinicAdmin', 'Doctor', 'Receptionist'), getPatientsReport);
router.get('/appointments', roleGuard('ClinicAdmin', 'Doctor', 'Receptionist'), getAppointmentsReport);

// Inventory — ClinicAdmin + Pharmacist
router.get('/inventory',    roleGuard('ClinicAdmin', 'Pharmacist'), getInventoryReport);

// Flat-row export — all roles (revenue/appointments/patients/inventory)
router.get('/export', roleGuard('ClinicAdmin', 'Doctor', 'Receptionist', 'Pharmacist'), getExportReport);

export default router;
