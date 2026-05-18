import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';
import {
  createLabReportSchema,
  updateLabReportSchema,
  updateStatusSchema,
} from '../utils/validators/labReport.validator';
import {
  listLabReports,
  createLabReport,
  getLabReport,
  updateLabReport,
  updateStatus,
  deleteLabReport,
  uploadFile,
  deleteFile,
} from '../controllers/labReport.controller';
import { uploadMiddleware } from '../middleware/upload';

const router = Router();

router.use(authenticate, tenantResolver);

// Collection
router.get('/', listLabReports);

router.post(
  '/',
  roleGuard('ClinicAdmin', 'Doctor', 'Receptionist'),
  validate(createLabReportSchema),
  createLabReport
);

// Resource
router.get('/:id', getLabReport);

router.put(
  '/:id',
  roleGuard('ClinicAdmin', 'Doctor', 'Receptionist'),
  validate(updateLabReportSchema),
  updateLabReport
);

router.patch(
  '/:id/status',
  roleGuard('ClinicAdmin', 'Doctor', 'Receptionist'),
  validate(updateStatusSchema),
  updateStatus
);

router.delete(
  '/:id',
  roleGuard('ClinicAdmin', 'Doctor'),
  deleteLabReport
);

// ── File attachments ──────────────────────────────────────────────────────────
router.post(
  '/:id/files',
  roleGuard('ClinicAdmin', 'Doctor', 'Receptionist'),
  uploadMiddleware.single('file'),
  uploadFile
);

router.delete(
  '/:id/files',
  roleGuard('ClinicAdmin', 'Doctor', 'Receptionist'),
  deleteFile
);

export default router;
