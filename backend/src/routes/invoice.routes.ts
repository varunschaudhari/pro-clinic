import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';
import { createInvoiceSchema, cancelInvoiceSchema, updateInvoiceSchema } from '../utils/validators/invoice.validator';
import {
  listInvoices,
  getStats,
  getDayEndReport,
  getAnalytics,
  createInvoice,
  getInvoice,
  updateInvoice,
  recordPayment,
  cancelInvoice,
  deleteInvoice,
} from '../controllers/invoice.controller';
import { issueRefund, getCreditNote } from '../controllers/creditNote.controller';

const router = Router();

router.use(authenticate, tenantResolver);

// Collection
router.get('/',                     listInvoices);
router.get('/stats',                getStats);
router.get('/day-end',              roleGuard('ClinicAdmin', 'Receptionist'), getDayEndReport);
router.get('/analytics',            roleGuard('ClinicAdmin', 'Receptionist'), getAnalytics);
router.get('/credit-notes/:cnId',   roleGuard('ClinicAdmin', 'Receptionist'), getCreditNote);

router.post(
  '/',
  roleGuard('ClinicAdmin', 'Receptionist', 'Doctor', 'Pharmacist'),
  validate(createInvoiceSchema),
  createInvoice
);

// Resource
router.get('/:id', getInvoice);

router.put(
  '/:id',
  roleGuard('ClinicAdmin', 'Receptionist', 'Doctor', 'Pharmacist'),
  validate(updateInvoiceSchema),
  updateInvoice
);

router.post(
  '/:id/payment',
  roleGuard('ClinicAdmin', 'Receptionist', 'Pharmacist'),
  recordPayment
);

router.post(
  '/:id/refund',
  roleGuard('ClinicAdmin'),
  issueRefund
);

router.post(
  '/:id/cancel',
  roleGuard('ClinicAdmin'),
  validate(cancelInvoiceSchema),
  cancelInvoice
);

router.delete(
  '/:id',
  roleGuard('ClinicAdmin'),
  deleteInvoice
);

export default router;
