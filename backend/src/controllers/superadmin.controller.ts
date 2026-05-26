import { Request, Response } from 'express';
import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';

import { asyncHandler } from '../utils/asyncHandler';
import { ApiResponse } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { Clinic } from '../models/Clinic.model';
import { User } from '../models/User.model';
import { Patient } from '../models/Patient.model';
import { Appointment } from '../models/Appointment.model';
import { CLINIC_TYPES, SUBSCRIPTION_PLANS, SUBSCRIPTION_STATUS } from '../constants';

// ── Platform analytics ────────────────────────────────────────────────────────

export const getPlatformAnalytics = asyncHandler(async (_req: Request, res: Response) => {
  const now = new Date();

  const [clinicStats, patientCount, appointmentCount, planDist, recentClinics] = await Promise.all([
    Clinic.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: null,
          total:     { $sum: 1 },
          active:    { $sum: { $cond: [{ $and: [{ $eq: ['$isActive', true] }, { $eq: ['$subscription.status', 'active'] }] }, 1, 0] } },
          trial:     { $sum: { $cond: [{ $eq: ['$subscription.plan', 'trial'] }, 1, 0] } },
          expired:   { $sum: { $cond: [{ $or: [{ $eq: ['$subscription.status', 'expired'] }, { $lt: ['$subscription.endDate', now] }] }, 1, 0] } },
          suspended: { $sum: { $cond: [{ $eq: ['$subscription.status', 'suspended'] }, 1, 0] } },
          inactive:  { $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } },
        },
      },
    ]),
    Patient.countDocuments({ isDeleted: false }),
    Appointment.countDocuments({ isDeleted: false }),
    Clinic.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: '$subscription.plan', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Clinic.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name slug type address.city subscription.plan subscription.status isActive createdAt')
      .lean(),
  ]);

  const s = clinicStats[0] ?? { total: 0, active: 0, trial: 0, expired: 0, suspended: 0, inactive: 0 };

  return ApiResponse.success(res, {
    clinics: {
      total:     s.total,
      active:    s.active,
      trial:     s.trial,
      expired:   s.expired,
      suspended: s.suspended,
      inactive:  s.inactive,
    },
    patients:     patientCount,
    appointments: appointmentCount,
    planDistribution: planDist.map((p: any) => ({ plan: p._id as string, count: p.count as number })),
    recentClinics,
  });
});

// ── List all clinics ──────────────────────────────────────────────────────────

export const listClinics = asyncHandler(async (req: Request, res: Response) => {
  const page   = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit  = Math.min(100, parseInt(req.query.limit as string) || 20);
  const search = (req.query.search as string || '').trim();
  const status = req.query.status as string | undefined;
  const plan   = req.query.plan   as string | undefined;

  const filter: Record<string, any> = { isDeleted: false };
  if (search) {
    filter.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { 'address.city': { $regex: search, $options: 'i' } },
    ];
  }
  if (status === 'active')    filter.isActive = true;
  if (status === 'inactive')  filter.isActive = false;
  if (status === 'suspended') filter['subscription.status'] = 'suspended';
  if (status === 'expired')   filter['subscription.status'] = 'expired';
  if (plan) filter['subscription.plan'] = plan;

  const [clinics, total] = await Promise.all([
    Clinic.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('name slug type mobile email address subscription isActive createdAt')
      .lean(),
    Clinic.countDocuments(filter),
  ]);

  return ApiResponse.success(res, {
    data:  clinics,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});

// ── Get single clinic with staff + usage ─────────────────────────────────────

export const getClinicDetail = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid clinic ID');

  const clinicId = new Types.ObjectId(id);

  const [clinic, staff, patientCount, apptCount, recentAppts] = await Promise.all([
    Clinic.findOne({ _id: clinicId, isDeleted: false }).lean(),
    User.find({ clinicId, isDeleted: false })
      .select('name mobile email role isActive createdAt')
      .sort({ role: 1, name: 1 })
      .lean(),
    Patient.countDocuments({ clinicId, isDeleted: false }),
    Appointment.countDocuments({ clinicId, isDeleted: false }),
    Appointment.countDocuments({
      clinicId,
      isDeleted: false,
      appointmentDate: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }),
  ]);

  if (!clinic) throw ApiError.notFound('Clinic');

  return ApiResponse.success(res, {
    clinic,
    staff,
    usage: {
      totalPatients:     patientCount,
      totalAppointments: apptCount,
      appointmentsLast30Days: recentAppts,
    },
  });
});

// ── Create clinic + ClinicAdmin ───────────────────────────────────────────────

export const createClinic = asyncHandler(async (req: Request, res: Response) => {
  const {
    // Clinic fields
    name, type, mobile, email, website,
    address,
    registrationNumber, gstin,
    // Subscription
    plan, endDate, maxDoctors, maxPatients,
    // Admin user
    adminName, adminMobile, adminEmail, adminPassword,
  } = req.body;

  // Validations
  if (!name?.trim())       throw ApiError.badRequest('Clinic name is required');
  if (!CLINIC_TYPES.includes(type)) throw ApiError.badRequest('Invalid clinic type');
  if (!mobile || !/^[6-9]\d{9}$/.test(mobile)) throw ApiError.badRequest('Invalid clinic mobile');
  if (!email || !/\S+@\S+\.\S+/.test(email))   throw ApiError.badRequest('Invalid clinic email');
  if (!address?.line1 || !address?.city || !address?.state || !address?.pincode) {
    throw ApiError.badRequest('Complete address is required');
  }
  if (!adminName?.trim())   throw ApiError.badRequest('Admin name is required');
  if (!adminMobile || !/^[6-9]\d{9}$/.test(adminMobile)) throw ApiError.badRequest('Invalid admin mobile');
  if (!adminEmail || !/\S+@\S+\.\S+/.test(adminEmail))   throw ApiError.badRequest('Invalid admin email');
  if (!adminPassword || adminPassword.length < 8) throw ApiError.badRequest('Admin password must be at least 8 characters');

  // Uniqueness checks
  const [existingClinic, existingUser] = await Promise.all([
    Clinic.findOne({ $or: [{ mobile }, { email: email.toLowerCase() }] }).lean(),
    User.findOne({ $or: [{ mobile: adminMobile }, { email: adminEmail.toLowerCase() }] }).lean(),
  ]);
  if (existingClinic) throw ApiError.conflict('A clinic with this mobile or email already exists');
  if (existingUser)   throw ApiError.conflict('A user with this mobile or email already exists');

  // Generate slug
  const baseSlug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const slugSuffix = Date.now().toString(36);
  const slug = `${baseSlug}-${slugSuffix}`;

  const subPlan   = Object.values(SUBSCRIPTION_PLANS).includes(plan) ? plan : SUBSCRIPTION_PLANS.TRIAL;
  const subEnd    = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const maxDoc    = parseInt(maxDoctors) || 1;
  const maxPat    = parseInt(maxPatients) || 500;

  const clinic = await Clinic.create({
    name: name.trim(),
    slug,
    type,
    mobile,
    email: email.toLowerCase(),
    website: website?.trim() || undefined,
    address: {
      line1:   address.line1.trim(),
      line2:   address.line2?.trim() || undefined,
      city:    address.city.trim(),
      state:   address.state,
      pincode: address.pincode,
    },
    registrationNumber: registrationNumber?.trim() || undefined,
    gstin: gstin?.trim().toUpperCase() || undefined,
    subscription: {
      plan:        subPlan,
      status:      SUBSCRIPTION_STATUS.ACTIVE,
      startDate:   new Date(),
      endDate:     subEnd,
      maxDoctors:  maxDoc,
      maxPatients: maxPat,
    },
    isActive: true,
  });

  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  const admin = await User.create({
    clinicId:         clinic._id,
    name:             adminName.trim(),
    mobile:           adminMobile,
    email:            adminEmail.toLowerCase(),
    password:         adminPassword,
    role:             'ClinicAdmin',
    isInviteAccepted: true,
    isActive:         true,
  });
  // Keep the hashed password consistent (User model pre-save hook hashes it)
  void hashedPassword; // model pre-save handles hashing

  return ApiResponse.success(res, { clinic, admin: { _id: admin._id, name: admin.name, email: admin.email } }, 'Clinic created successfully', 201);
});

// ── Update subscription ───────────────────────────────────────────────────────

export const updateClinicSubscription = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid clinic ID');

  const { plan, status, endDate, maxDoctors, maxPatients } = req.body;

  const update: Record<string, any> = {};
  if (plan && Object.values(SUBSCRIPTION_PLANS).includes(plan)) update['subscription.plan'] = plan;
  if (status && Object.values(SUBSCRIPTION_STATUS).includes(status)) update['subscription.status'] = status;
  if (endDate) update['subscription.endDate'] = new Date(endDate);
  if (maxDoctors !== undefined) update['subscription.maxDoctors'] = parseInt(maxDoctors);
  if (maxPatients !== undefined) update['subscription.maxPatients'] = parseInt(maxPatients);

  if (Object.keys(update).length === 0) throw ApiError.badRequest('No valid fields to update');

  const clinic = await Clinic.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: update },
    { new: true, runValidators: true },
  ).lean();

  if (!clinic) throw ApiError.notFound('Clinic');
  return ApiResponse.success(res, clinic, 'Subscription updated');
});

// ── Toggle clinic active status ───────────────────────────────────────────────

export const toggleClinicStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!Types.ObjectId.isValid(id)) throw ApiError.badRequest('Invalid clinic ID');

  const clinic = await Clinic.findOne({ _id: id, isDeleted: false });
  if (!clinic) throw ApiError.notFound('Clinic');

  clinic.isActive = !clinic.isActive;
  if (!clinic.isActive) {
    (clinic.subscription as any).status = SUBSCRIPTION_STATUS.SUSPENDED;
  } else {
    (clinic.subscription as any).status = SUBSCRIPTION_STATUS.ACTIVE;
  }
  await clinic.save();

  return ApiResponse.success(res, { isActive: clinic.isActive, subscriptionStatus: clinic.subscription.status },
    clinic.isActive ? 'Clinic activated' : 'Clinic suspended');
});
