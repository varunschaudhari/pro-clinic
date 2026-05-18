import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Clinic } from '../models/Clinic.model';
import { ApiError } from '../utils/ApiError';
import { ROLES } from '../constants';

/**
 * Resolves and validates the tenant (clinic) context for every request.
 * SuperAdmin can optionally pass X-Clinic-Id header to operate on behalf of a clinic.
 * All other roles must have a clinicId bound to their JWT.
 */
export const tenantResolver = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    const { role, clinicId } = req.user;

    // SuperAdmin can act on behalf of a specific clinic via header
    if (role === ROLES.SUPER_ADMIN) {
      const headerClinicId = req.headers['x-clinic-id'] as string;
      if (headerClinicId) {
        if (!Types.ObjectId.isValid(headerClinicId)) {
          return next(ApiError.badRequest('Invalid X-Clinic-Id header'));
        }
        const clinic = await Clinic.findById(headerClinicId).lean();
        if (!clinic) return next(ApiError.notFound('Clinic'));
        req.clinicId = new Types.ObjectId(headerClinicId);
      }
      return next();
    }

    // All other roles must have a clinicId from their JWT
    if (!clinicId) {
      return next(ApiError.forbidden('No clinic associated with this account'));
    }

    const clinic = await Clinic.findOne({
      _id: clinicId,
      isActive: true,
    }).lean();

    if (!clinic) {
      return next(ApiError.forbidden('Your clinic is inactive or does not exist'));
    }

    // Subscription check
    if (
      clinic.subscription.status === 'expired' ||
      clinic.subscription.endDate < new Date()
    ) {
      return next(ApiError.forbidden('Clinic subscription has expired'));
    }

    req.clinicId = clinicId;
    next();
  } catch (error) {
    next(error);
  }
};
