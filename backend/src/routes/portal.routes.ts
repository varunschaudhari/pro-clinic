import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import {
  generateToken, revokeToken, getPortalData,
  downloadPrescriptionPdf, downloadAllPrescriptionsPdf,
} from '../controllers/portal.controller';

const router = Router();

// ── Public — no auth required ────────────────────────────────────────────────
// More-specific paths must come before /:token
router.get('/:token/prescription/:rxId/pdf', downloadPrescriptionPdf);
router.get('/:token/prescriptions/pdf',      downloadAllPrescriptionsPdf);
router.get('/:token',                        getPortalData);

// ── Protected — clinic staff only ───────────────────────────────────────────
router.post(
  '/generate',
  authenticate,
  tenantResolver,
  roleGuard('ClinicAdmin', 'Doctor', 'Receptionist'),
  generateToken
);
router.post(
  '/revoke',
  authenticate,
  tenantResolver,
  roleGuard('ClinicAdmin', 'Doctor', 'Receptionist'),
  revokeToken
);

export default router;
