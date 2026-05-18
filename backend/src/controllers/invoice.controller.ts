import { Request, Response } from 'express';
import { InvoiceService } from '../services/invoice.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import {
  listInvoicesSchema,
  recordPaymentSchema,
} from '../utils/validators/invoice.validator';

export const listInvoices = asyncHandler(async (req: Request, res: Response) => {
  const parsed = listInvoicesSchema.safeParse(req.query);
  const params = parsed.success ? parsed.data : { page: 1, limit: 20 };

  const result = await InvoiceService.listInvoices(
    req.clinicId!,
    params as Parameters<typeof InvoiceService.listInvoices>[1],
    req.user!.role
  );

  return ApiResponse.paginated(res, result);
});

export const getStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await InvoiceService.getStats(req.clinicId!);
  return ApiResponse.success(res, stats);
});

export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  const inv = await InvoiceService.createInvoice(
    req.clinicId!,
    req.body,
    req.user!.userId,
    req.user!.role
  );
  return ApiResponse.created(res, inv, 'Invoice created successfully');
});

export const getInvoice = asyncHandler(async (req: Request, res: Response) => {
  const inv = await InvoiceService.getInvoiceById(req.clinicId!, req.params.id);
  return ApiResponse.success(res, inv);
});

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const parsed = recordPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
    return res.status(422).json({ success: false, message: 'Validation failed', errors });
  }

  const inv = await InvoiceService.recordPayment(
    req.clinicId!,
    req.params.id,
    parsed.data,
    req.user!.userId
  );
  return ApiResponse.success(res, inv, 'Payment recorded successfully');
});

export const cancelInvoice = asyncHandler(async (req: Request, res: Response) => {
  const inv = await InvoiceService.cancelInvoice(
    req.clinicId!,
    req.params.id,
    req.body,
    req.user!.userId,
    req.user!.role
  );
  return ApiResponse.success(res, inv, 'Invoice cancelled');
});

export const deleteInvoice = asyncHandler(async (req: Request, res: Response) => {
  await InvoiceService.deleteInvoice(
    req.clinicId!,
    req.params.id,
    req.user!.userId,
    req.user!.role
  );
  return ApiResponse.noContent(res);
});
