import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';
import { createDrugSchema, updateDrugSchema } from '../utils/validators/pharmacy.validator';
import {
  listDrugs,
  getStats,
  createDrug,
  getDrug,
  updateDrug,
  deleteDrug,
  stockIn,
  stockOut,
  dispense,
  getTransactions,
  getAllTransactions,
} from '../controllers/pharmacy.controller';

const router = Router();

router.use(authenticate, tenantResolver);

// ── Static routes first (before /:id) ─────────────────────────────────────────
router.get('/stats',        getStats);
router.get('/transactions', getAllTransactions);
router.post('/dispense', roleGuard('ClinicAdmin', 'Pharmacist', 'Doctor'), dispense);

// ── Collection ────────────────────────────────────────────────────────────────
router.get('/', listDrugs);

router.post(
  '/',
  roleGuard('ClinicAdmin', 'Pharmacist'),
  validate(createDrugSchema),
  createDrug
);

// ── Resource ──────────────────────────────────────────────────────────────────
router.get('/:id', getDrug);

router.put(
  '/:id',
  roleGuard('ClinicAdmin', 'Pharmacist'),
  validate(updateDrugSchema),
  updateDrug
);

router.delete('/:id', roleGuard('ClinicAdmin'), deleteDrug);

router.post('/:id/stock-in',  roleGuard('ClinicAdmin', 'Pharmacist'), stockIn);
router.post('/:id/stock-out', roleGuard('ClinicAdmin', 'Pharmacist'), stockOut);

router.get('/:id/transactions', getTransactions);

export default router;
