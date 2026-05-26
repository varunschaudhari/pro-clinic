import { Request, Response } from 'express';
import { AuditService } from '../services/audit.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import type { AuditAction } from '../models/AuditLog.model';

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const page      = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit     = Math.min(100, parseInt(req.query.limit as string) || 30);
  const entity    = (req.query.entity    as string)     || undefined;
  const action    = (req.query.action    as AuditAction) || undefined;
  const startDate = (req.query.startDate as string)     || undefined;
  const endDate   = (req.query.endDate   as string)     || undefined;

  const result = await AuditService.list(req.clinicId!, {
    page, limit, entity, action, startDate, endDate,
  });

  return ApiResponse.paginated(res, result);
});

export const getEntityHistory = asyncHandler(async (req: Request, res: Response) => {
  const { entity, entityId } = req.params;
  const logs = await AuditService.getEntityHistory(req.clinicId!, entity, entityId);
  return ApiResponse.success(res, logs);
});
