import { Router } from 'express';
import { getClinicInfo, getDoctorSlots, createBooking } from '../controllers/booking.controller';

const router = Router();

// All routes are public — no authenticate or tenantResolver.
// Rate limiting is applied globally by the app-level limiter in production.

router.get('/clinic/:slug',                     getClinicInfo);
router.get('/clinic/:slug/slots',               getDoctorSlots);
router.post('/clinic/:slug/appointments',       createBooking);

export default router;
