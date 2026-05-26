import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';
import {
  createPrescriptionSchema,
  updatePrescriptionSchema,
} from '../utils/validators/prescription.validator';
import {
  listPrescriptions,
  createPrescription,
  getPrescription,
  updatePrescription,
  recordPrint,
  deletePrescription,
  lookupPrescription,
} from '../controllers/prescription.controller';

const router = Router();

router.use(authenticate, tenantResolver);

// ── Pharmacist lookup by number ────────────────────────────────────────────────
router.get('/lookup', roleGuard('ClinicAdmin', 'Doctor', 'Pharmacist', 'Receptionist'), lookupPrescription);

// Collection
router.get('/', listPrescriptions);

router.post(
  '/',
  roleGuard('ClinicAdmin', 'Doctor'),
  validate(createPrescriptionSchema),
  createPrescription
);

// Resource
router.get('/:id', getPrescription);

router.put(
  '/:id',
  roleGuard('ClinicAdmin', 'Doctor'),
  validate(updatePrescriptionSchema),
  updatePrescription
);

router.post(
  '/:id/print',
  recordPrint
);

router.delete(
  '/:id',
  roleGuard('ClinicAdmin', 'Doctor'),
  deletePrescription
);

export default router;
