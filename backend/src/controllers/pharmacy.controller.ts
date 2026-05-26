import { Request, Response } from 'express';
import { PharmacyService } from '../services/pharmacy.service';
import { AuditService } from '../services/audit.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import {
  listDrugsSchema,
  stockInSchema,
  stockOutSchema,
  dispenseSchema,
} from '../utils/validators/pharmacy.validator';

export const listDrugs = asyncHandler(async (req: Request, res: Response) => {
  const parsed = listDrugsSchema.safeParse(req.query);
  const params = parsed.success ? parsed.data : { page: 1, limit: 20 };
  const result = await PharmacyService.listDrugs(req.clinicId!.toString(), params as any);
  return ApiResponse.paginated(res, result);
});

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await PharmacyService.getStats(req.clinicId!.toString());
  return ApiResponse.success(res, stats);
});

export const createDrug = asyncHandler(async (req: Request, res: Response) => {
  const drug = await PharmacyService.createDrug(req.clinicId!.toString(), req.body, req.user!.userId.toString());

  AuditService.log({
    clinicId: req.clinicId!, action: 'CREATE', entity: 'Drug',
    entityId: (drug as any)._id, entityLabel: (drug as any).name ?? '',
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Added drug ${(drug as any).name ?? ''} to inventory`,
  });

  return ApiResponse.created(res, drug, 'Drug added to inventory');
});

export const getDrug = asyncHandler(async (req: Request, res: Response) => {
  const drug = await PharmacyService.getDrugById(req.clinicId!.toString(), req.params.id);
  return ApiResponse.success(res, drug);
});

export const updateDrug = asyncHandler(async (req: Request, res: Response) => {
  const drug = await PharmacyService.updateDrug(req.clinicId!.toString(), req.params.id, req.body);

  AuditService.log({
    clinicId: req.clinicId!, action: 'UPDATE', entity: 'Drug',
    entityId: req.params.id, entityLabel: (drug as any).name ?? '',
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Updated drug ${(drug as any).name ?? ''}`,
  });

  return ApiResponse.success(res, drug, 'Drug updated');
});

export const deleteDrug = asyncHandler(async (req: Request, res: Response) => {
  await PharmacyService.deleteDrug(req.clinicId!.toString(), req.params.id, req.user!.userId.toString());

  AuditService.log({
    clinicId: req.clinicId!, action: 'DELETE', entity: 'Drug',
    entityId: req.params.id, entityLabel: req.params.id,
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Deleted drug from inventory`,
  });

  return ApiResponse.noContent(res);
});

export const stockIn = asyncHandler(async (req: Request, res: Response) => {
  const parsed = stockInSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
    return res.status(422).json({ success: false, message: 'Validation failed', errors });
  }
  const txnType = (req.query.type as string) === 'adjustment' ? 'adjustment'
    : (req.query.type as string) === 'return' ? 'return'
    : 'purchase';
  const drug = await PharmacyService.stockIn(req.clinicId!.toString(), req.params.id, parsed.data, req.user!.userId.toString(), txnType);

  AuditService.log({
    clinicId: req.clinicId!, action: 'UPDATE', entity: 'Drug',
    entityId: req.params.id, entityLabel: (drug as any).name ?? '',
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Stocked in ${(parsed.data as any).quantity ?? ''} units of ${(drug as any).name ?? ''} (${txnType})`,
  });

  return ApiResponse.success(res, drug, 'Stock updated');
});

export const dispense = asyncHandler(async (req: Request, res: Response) => {
  const parsed = dispenseSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
    return res.status(422).json({ success: false, message: 'Validation failed', errors });
  }
  const result = await PharmacyService.dispense(req.clinicId!.toString(), parsed.data, req.user!.userId.toString());

  AuditService.log({
    clinicId: req.clinicId!, action: 'UPDATE', entity: 'Drug',
    entityId: req.clinicId!.toString(), entityLabel: 'Bulk Dispense',
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Dispensed prescription drugs`,
  });

  return ApiResponse.success(res, result, 'Drugs dispensed successfully');
});

export const stockOut = asyncHandler(async (req: Request, res: Response) => {
  const parsed = stockOutSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
    return res.status(422).json({ success: false, message: 'Validation failed', errors });
  }
  const drug = await PharmacyService.stockOut(req.clinicId!.toString(), req.params.id, parsed.data, req.user!.userId.toString());

  AuditService.log({
    clinicId: req.clinicId!, action: 'UPDATE', entity: 'Drug',
    entityId: req.params.id, entityLabel: (drug as any).name ?? '',
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Written off ${(parsed.data as any).quantity ?? ''} units of ${(drug as any).name ?? ''}`,
  });

  return ApiResponse.success(res, drug, 'Stock written off');
});

export const getTransactions = asyncHandler(async (req: Request, res: Response) => {
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
  const type  = (req.query.type as string) || undefined;
  const result = await PharmacyService.getTransactions(req.clinicId!.toString(), req.params.id, { page, limit, type });
  return ApiResponse.paginated(res, result);
});

export const getAllTransactions = asyncHandler(async (req: Request, res: Response) => {
  const page      = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit     = Math.min(100, parseInt(req.query.limit as string) || 30);
  const type      = (req.query.type      as string) || undefined;
  const drugId    = (req.query.drugId    as string) || undefined;
  const startDate = (req.query.startDate as string) || undefined;
  const endDate   = (req.query.endDate   as string) || undefined;

  const result = await PharmacyService.getAllTransactions(
    req.clinicId!.toString(),
    { page, limit, type, drugId, startDate, endDate }
  );
  return ApiResponse.paginated(res, result);
});
