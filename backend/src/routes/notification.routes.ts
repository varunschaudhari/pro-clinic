import { Router } from 'express';
import { authenticate }   from '../middleware/authenticate';
import { tenantResolver } from '../middleware/tenantResolver';
import {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} from '../controllers/notification.controller';

const router = Router();

router.use(authenticate, tenantResolver);

router.get('/',               listNotifications);
router.get('/count',          getUnreadCount);
router.patch('/mark-all-read', markAllRead);
router.patch('/:id/read',     markRead);

export default router;
