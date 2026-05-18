import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantResolver } from '../middleware/tenantResolver';
import { getSummary } from '../controllers/dashboard.controller';

const router = Router();
router.use(authenticate, tenantResolver);

router.get('/', getSummary);

export default router;
