import { Request, Response, NextFunction } from 'express';
import { Role, ROLES } from '../constants';
import { ApiError } from '../utils/ApiError';

// ClinicAdmin inherits all Doctor permissions
const expandRoles = (roles: Role[]): Role[] =>
  roles.includes(ROLES.DOCTOR) && !roles.includes(ROLES.CLINIC_ADMIN)
    ? [...roles, ROLES.CLINIC_ADMIN]
    : roles;

export const roleGuard = (...allowedRoles: Role[]) => {
  const effective = expandRoles(allowedRoles);
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!effective.includes(req.user.role)) {
      return next(ApiError.forbidden(`Access denied. Required role: ${allowedRoles.join(' or ')}`));
    }
    next();
  };
};
