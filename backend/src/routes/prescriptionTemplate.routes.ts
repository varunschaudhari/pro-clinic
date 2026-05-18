import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';
import {
  createTemplateSchema,
  updateTemplateSchema,
} from '../utils/validators/prescriptionTemplate.validator';
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../controllers/prescriptionTemplate.controller';

const router = Router();

router.use(authenticate, tenantResolver);

router.get('/', roleGuard('ClinicAdmin', 'Doctor'), listTemplates);

router.post(
  '/',
  roleGuard('ClinicAdmin', 'Doctor'),
  validate(createTemplateSchema),
  createTemplate,
);

router.put(
  '/:id',
  roleGuard('ClinicAdmin', 'Doctor'),
  validate(updateTemplateSchema),
  updateTemplate,
);

router.delete(
  '/:id',
  roleGuard('ClinicAdmin', 'Doctor'),
  deleteTemplate,
);

export default router;
