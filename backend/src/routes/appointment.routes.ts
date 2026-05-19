import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  updateStatusSchema,
} from '../utils/validators/appointment.validator';
import {
  listAppointments,
  getTodayStats,
  createAppointment,
  getAppointmentById,
  updateAppointment,
  updateStatus,
  deleteAppointment,
} from '../controllers/appointment.controller';

const router = Router();

// All appointment routes require authentication + clinic tenant
router.use(authenticate, tenantResolver);

// ── Collection routes ─────────────────────────────────────────────────────────
router.get('/',      listAppointments);
router.get('/stats', getTodayStats);

router.post(
  '/',
  roleGuard('ClinicAdmin', 'Receptionist', 'Doctor'),
  validate(createAppointmentSchema),
  createAppointment
);

// ── Resource routes ───────────────────────────────────────────────────────────
router.get('/:id', getAppointmentById);

router.patch(
  '/:id',
  roleGuard('ClinicAdmin', 'Receptionist', 'Doctor'),
  validate(updateAppointmentSchema),
  updateAppointment
);

router.patch(
  '/:id/status',
  roleGuard('ClinicAdmin', 'Receptionist', 'Doctor'),
  validate(updateStatusSchema),
  updateStatus
);

router.delete(
  '/:id',
  roleGuard('ClinicAdmin', 'Receptionist'),
  deleteAppointment
);

export default router;
