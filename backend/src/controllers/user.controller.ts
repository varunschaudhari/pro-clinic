import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { AuditService } from '../services/audit.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';

export const listStaff = asyncHandler(async (req: Request, res: Response) => {
  const result = await UserService.listStaff(req.clinicId!, req.query as any);
  return ApiResponse.paginated(res, result);
});

export const getStaffMember = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserService.getStaffMember(req.clinicId!, req.params.userId);
  return ApiResponse.success(res, user);
});

export const updateStaffMember = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserService.updateStaffMember(
    req.clinicId!,
    req.params.userId,
    req.body,
    req.user!.userId
  );

  AuditService.log({
    clinicId: req.clinicId!, action: 'UPDATE', entity: 'Staff',
    entityId: req.params.userId, entityLabel: (user as any).name ?? req.params.userId,
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Updated staff member ${(user as any).name ?? req.params.userId}`,
  });

  return ApiResponse.success(res, user, 'Staff member updated');
});

export const removeStaffMember = asyncHandler(async (req: Request, res: Response) => {
  await UserService.removeStaffMember(req.clinicId!, req.params.userId, req.user!.userId);

  AuditService.log({
    clinicId: req.clinicId!, action: 'DELETE', entity: 'Staff',
    entityId: req.params.userId, entityLabel: req.params.userId,
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Removed staff member`,
  });

  return ApiResponse.noContent(res);
});

export const resendInvite = asyncHandler(async (req: Request, res: Response) => {
  const result = await UserService.resendInvite(req.clinicId!, req.params.userId);
  return ApiResponse.success(res, result, 'Invite resent successfully');
});
