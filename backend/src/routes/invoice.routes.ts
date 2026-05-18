import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';
import { createInvoiceSchema, cancelInvoiceSchema } from '../utils/validators/invoice.validator';
import {
  listInvoices,
  getStats,
  createInvoice,
  getInvoice,
  recordPayment,
  cancelInvoice,
  deleteInvoice,
} from '../controllers/invoice.controller';

const router = Router();

router.use(authenticate, tenantResolver);

// Collection
router.get('/',      listInvoices);
router.get('/stats', getStats);

router.post(
  '/',
  roleGuard('ClinicAdmin', 'Receptionist', 'Doctor'),
  validate(createInvoiceSchema),
  createInvoice
);

// Resource
router.get('/:id', getInvoice);

router.post(
  '/:id/payment',
  roleGuard('ClinicAdmin', 'Receptionist'),
  recordPayment
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
