import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';
import { createVitalsSchema, updateVitalsSchema } from '../utils/validators/vitals.validator';
import {
  getByAppointment,
  getPatientHistory,
  createVitals,
  updateVitals,
} from '../controllers/vitals.controller';

const router = Router();
router.use(authenticate, tenantResolver);

// Static paths before /:id
router.get('/appointment/:appointmentId', getByAppointment);
router.get('/patient/:patientId',         getPatientHistory);

// Recording vitals — Doctors, Nurses (Receptionist in small clinics), ClinicAdmin
router.post(
  '/',
  roleGuard('ClinicAdmin', 'Doctor', 'Receptionist'),
  validate(createVitalsSchema),
  createVitals
);

router.put(
  '/:id',
  roleGuard('ClinicAdmin', 'Doctor', 'Receptionist'),
  validate(updateVitalsSchema),
  updateVitals
);

export default router;
