import { Router } from 'express';
import { authenticate }   from '../middleware/authenticate';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard }      from '../middleware/roleGuard';
import { ROLES }          from '../constants';
import { listAuditLogs, getEntityHistory } from '../controllers/audit.controller';

const router = Router();

router.use(authenticate, tenantResolver);

router.get('/', roleGuard(ROLES.CLINIC_ADMIN), listAuditLogs);

// Per-record history accessible to ClinicAdmin, Doctor, Receptionist
router.get(
  '/:entity/:entityId',
  roleGuard(ROLES.CLINIC_ADMIN, ROLES.DOCTOR, ROLES.RECEPTIONIST),
  getEntityHistory
);

export default router;
