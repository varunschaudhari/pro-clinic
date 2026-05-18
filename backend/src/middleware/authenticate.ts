import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { verifyAccessToken, ACCESS_COOKIE_NAME } from '../utils/jwt.utils';
import { ApiError } from '../utils/ApiError';
import { User } from '../models/User.model';

/**
 * Verifies the JWT access token from httpOnly cookie.
 * Attaches the decoded user payload to req.user.
 */
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.cookies?.[ACCESS_COOKIE_NAME];

    if (!token) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    const payload = verifyAccessToken(token);

    // Verify user still exists and is active
    const user = await User.findOne({
      _id: payload.userId,
      isActive: true,
      isDeleted: false,
    }).lean();

    if (!user) {
      return next(ApiError.unauthorized('User no longer exists or is inactive'));
    }

    req.user = {
      userId: new Types.ObjectId(payload.userId),
      clinicId: payload.clinicId ? new Types.ObjectId(payload.clinicId) : null,
      role: payload.role,
      email: payload.email,
      mobile: payload.mobile,
    };

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Session expired. Please login again'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(ApiError.unauthorized('Invalid token'));
    }
    next(error);
  }
};
