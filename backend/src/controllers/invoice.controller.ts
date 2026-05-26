import { Request, Response } from 'express';
import { InvoiceService } from '../services/invoice.service';
import { AuditService } from '../services/audit.service';
import { NotifyDispatch } from '../services/notifyDispatch.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import {
  listInvoicesSchema,
  recordPaymentSchema,
  updateInvoiceSchema,
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

  const invDoc = inv as any;
  AuditService.log({
    clinicId: req.clinicId!, action: 'CREATE', entity: 'Invoice',
    entityId: invDoc?._id ?? req.clinicId!.toString(), entityLabel: invDoc?.invoiceNumber ?? '',
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Created invoice ${invDoc?.invoiceNumber ?? ''}`,
  });

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

  AuditService.log({
    clinicId: req.clinicId!, action: 'UPDATE', entity: 'Invoice',
    entityId: req.params.id, entityLabel: (inv as any).invoiceNumber ?? '',
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Recorded payment for invoice ${(inv as any).invoiceNumber ?? ''}`,
  });

  const patient = (inv as any)?.patient;
  if (patient) {
    NotifyDispatch.paymentReceived({
      clinicId:      req.clinicId!,
      patientId:     { name: patient.name, mobile: patient.mobile, email: patient.email },
      invoiceNumber: (inv as any)?.invoiceNumber ?? '',
      totalAmount:   (inv as any)?.totalAmount  ?? 0,
      paidAmount:    (inv as any)?.paidAmount   ?? 0,
      balanceAmount: (inv as any)?.balanceAmount ?? 0,
      paymentStatus: (inv as any)?.paymentStatus ?? '',
      dueDate:       (inv as any)?.dueDate,
    }, parsed.data.amount, parsed.data.mode);
  }

  return ApiResponse.success(res, inv, 'Payment recorded successfully');
});

export const getDayEndReport = asyncHandler(async (req: Request, res: Response) => {
  const dateStr = (req.query.date as string) || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const report  = await InvoiceService.getDayEndReport(req.clinicId!, dateStr);
  return ApiResponse.success(res, report);
});

export const updateInvoice = asyncHandler(async (req: Request, res: Response) => {
  const parsed = updateInvoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
    return res.status(422).json({ success: false, message: 'Validation failed', errors });
  }

  const inv = await InvoiceService.updateInvoice(req.clinicId!, req.params.id, parsed.data);

  AuditService.log({
    clinicId: req.clinicId!, action: 'UPDATE', entity: 'Invoice',
    entityId: req.params.id, entityLabel: (inv as any)?.invoiceNumber ?? '',
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Updated invoice ${(inv as any)?.invoiceNumber ?? ''}`,
  });

  return ApiResponse.success(res, inv, 'Invoice updated');
});

export const getAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(parseInt((req.query.days as string) || '30', 10) || 30, 90);
  const data = await InvoiceService.getAnalytics(req.clinicId!, days);
  return ApiResponse.success(res, data);
});

export const cancelInvoice = asyncHandler(async (req: Request, res: Response) => {
  const inv = await InvoiceService.cancelInvoice(
    req.clinicId!,
    req.params.id,
    req.body,
    req.user!.userId,
    req.user!.role
  );

  AuditService.log({
    clinicId: req.clinicId!, action: 'UPDATE', entity: 'Invoice',
    entityId: req.params.id, entityLabel: (inv as any).invoiceNumber ?? '',
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Cancelled invoice ${(inv as any).invoiceNumber ?? ''}`,
  });

  return ApiResponse.success(res, inv, 'Invoice cancelled');
});

export const deleteInvoice = asyncHandler(async (req: Request, res: Response) => {
  await InvoiceService.deleteInvoice(
    req.clinicId!,
    req.params.id,
    req.user!.userId,
    req.user!.role
  );

  AuditService.log({
    clinicId: req.clinicId!, action: 'DELETE', entity: 'Invoice',
    entityId: req.params.id, entityLabel: req.params.id,
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Deleted invoice`,
  });

  return ApiResponse.noContent(res);
});
