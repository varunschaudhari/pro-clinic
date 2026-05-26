import { Router } from 'express';
import { authenticate }   from '../middleware/authenticate';
import { roleGuard }      from '../middleware/roleGuard';
import {
  getPlatformAnalytics,
  listClinics,
  getClinicDetail,
  createClinic,
  updateClinicSubscription,
  toggleClinicStatus,
} from '../controllers/superadmin.controller';

const router = Router();

// All superadmin routes require authentication + SuperAdmin role.
// tenantResolver is intentionally NOT applied here — SuperAdmin has no clinicId.
router.use(authenticate, roleGuard('SuperAdmin'));

router.get('/analytics',             getPlatformAnalytics);
router.get('/clinics',               listClinics);
router.post('/clinics',              createClinic);
router.get('/clinics/:id',           getClinicDetail);
router.patch('/clinics/:id/subscription', updateClinicSubscription);
router.patch('/clinics/:id/status',  toggleClinicStatus);

export default router;
