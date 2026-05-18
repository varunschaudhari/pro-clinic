import { Router } from 'express';
import {
  listStaff,
  getStaffMember,
  updateStaffMember,
  removeStaffMember,
  resendInvite,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/authenticate';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';
import { listStaffSchema, updateStaffSchema } from '../utils/validators/user.validator';
import { ROLES } from '../constants';

const router = Router();

router.use(authenticate, tenantResolver);

// All clinic staff can see the staff list (e.g. receptionist needs doctor list for appointments)
router.get('/', (req, res, next) => {
  // Parse query params through validator
  const parsed = listStaffSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(422).json({ success: false, message: 'Invalid query params', errors: parsed.error.errors });
    return;
  }
  req.query = parsed.data as any;
  next();
}, listStaff);

// ClinicAdmin-only management routes
router.use(roleGuard(ROLES.CLINIC_ADMIN));

router.get('/:userId', getStaffMember);
router.patch('/:userId', validate(updateStaffSchema), updateStaffMember);
router.delete('/:userId', removeStaffMember);
router.post('/:userId/resend-invite', resendInvite);

export default router;
