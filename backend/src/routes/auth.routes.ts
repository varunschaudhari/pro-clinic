import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  registerClinic,
  login,
  refreshToken,
  logout,
  inviteUser,
  acceptInvite,
  getMe,
  changePassword,
  updateProfile,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import { validate } from '../middleware/validate';
import {
  clinicRegistrationSchema,
  loginSchema,
  inviteUserSchema,
  acceptInviteSchema,
  changePasswordSchema,
  updateProfileSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../utils/validators/auth.validator';
import { ROLES } from '../constants';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
});

// ── Public ──────────────────────────────────────────────
router.post('/register',        authLimiter, validate(clinicRegistrationSchema), registerClinic);
router.post('/login',           authLimiter, validate(loginSchema), login);
router.post('/refresh',         refreshToken);
router.post('/invite/accept',   validate(acceptInviteSchema), acceptInvite);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password',  authLimiter, validate(resetPasswordSchema),  resetPassword);

// ── Authenticated ────────────────────────────────────────
router.use(authenticate);

router.post('/logout', logout);
router.get('/me', getMe);
router.put('/profile', validate(updateProfileSchema), updateProfile);
router.put('/change-password', validate(changePasswordSchema), changePassword);

// ── ClinicAdmin only ─────────────────────────────────────
router.post(
  '/invite',
  tenantResolver,
  roleGuard(ROLES.CLINIC_ADMIN),
  validate(inviteUserSchema),
  inviteUser
);

export default router;
