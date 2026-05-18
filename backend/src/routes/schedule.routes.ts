import { Router } from 'express';
import { authenticate }    from '../middleware/authenticate';
import { tenantResolver }  from '../middleware/tenantResolver';
import { roleGuard }       from '../middleware/roleGuard';
import {
  listDoctors,
  getSchedule,
  upsertSchedule,
  getAvailability,
  getLeaves,
  addLeave,
  deleteLeave,
} from '../controllers/schedule.controller';

const router = Router();

router.use(authenticate, tenantResolver);

// ── Doctor list with schedule summary ────────────────────────────────────────
router.get('/doctors', listDoctors);

// ── Per-doctor schedule management ───────────────────────────────────────────
router.get('/doctors/:doctorId',            getSchedule);
router.put('/doctors/:doctorId', roleGuard('ClinicAdmin'), upsertSchedule);

// ── Available slots for a date ────────────────────────────────────────────────
router.get('/doctors/:doctorId/availability', getAvailability);

// ── Leaves ────────────────────────────────────────────────────────────────────
router.get(   '/doctors/:doctorId/leaves',             getLeaves);
router.post(  '/doctors/:doctorId/leaves', roleGuard('ClinicAdmin', 'Doctor'), addLeave);
router.delete('/doctors/:doctorId/leaves/:leaveId', roleGuard('ClinicAdmin', 'Doctor'), deleteLeave);

export default router;
