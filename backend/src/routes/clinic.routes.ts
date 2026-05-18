import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';
import { updateClinicSchema } from '../utils/validators/clinic.validator';
import { getSettings, updateSettings, uploadLogo } from '../controllers/clinic.controller';
import { UPLOAD_ROOT } from '../middleware/upload';

// Logo-specific multer — stores to uploads/{clinicId}/logo/
const logoStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(UPLOAD_ROOT, req.clinicId!.toString(), 'logo');
    try { fs.mkdirSync(dir, { recursive: true }); cb(null, dir); }
    catch (err) { cb(err as Error, ''); }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo-${Date.now()}${ext}`);
  },
});

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']);
    cb(null, allowed.has(file.mimetype));
  },
});

const router = Router();

router.use(authenticate, tenantResolver);

// All authenticated roles can read clinic settings (needed for print views)
router.get('/', getSettings);

// Only ClinicAdmin can update settings
router.patch('/', roleGuard('ClinicAdmin'), validate(updateClinicSchema), updateSettings);

// Logo upload
router.post('/logo', roleGuard('ClinicAdmin'), logoUpload.single('logo'), uploadLogo);

export default router;
