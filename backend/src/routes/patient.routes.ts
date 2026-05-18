import { Router } from 'express';
import {
  createPatient,
  listPatients,
  getPatient,
  updatePatient,
  deletePatient,
  searchPatients,
} from '../controllers/patient.controller';
import { authenticate } from '../middleware/authenticate';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';
import { createPatientSchema, updatePatientSchema } from '../utils/validators/patient.validator';
import { ROLES } from '../constants';

const router = Router();

// All patient routes require auth + tenant
router.use(authenticate, tenantResolver);

// Roles allowed to manage patients
const patientAccess = roleGuard(
  ROLES.CLINIC_ADMIN,
  ROLES.DOCTOR,
  ROLES.RECEPTIONIST
);

router.get('/search', patientAccess, searchPatients);
router.get('/', patientAccess, listPatients);
router.post('/', patientAccess, validate(createPatientSchema), createPatient);

router.get('/:patientId', patientAccess, getPatient);
router.put('/:patientId', patientAccess, validate(updatePatientSchema), updatePatient);
router.delete('/:patientId', roleGuard(ROLES.CLINIC_ADMIN), deletePatient);

export default router;
