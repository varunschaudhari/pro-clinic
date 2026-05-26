import { Request, Response } from 'express';
import { CreditNoteService } from '../services/creditNote.service';
import { AuditService } from '../services/audit.service';
import { ApiResponse } from '../utils/ApiResponse';
import { asyncHandler } from '../utils/asyncHandler';
import { issueRefundSchema } from '../utils/validators/invoice.validator';

export const issueRefund = asyncHandler(async (req: Request, res: Response) => {
  const parsed = issueRefundSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.errors.map((e) => ({ field: e.path.join('.'), message: e.message }));
    return res.status(422).json({ success: false, message: 'Validation failed', errors });
  }

  const cn = await CreditNoteService.issueRefund(
    req.clinicId!,
    req.params.id,
    parsed.data,
    req.user!.userId
  );

  AuditService.log({
    clinicId: req.clinicId!, action: 'CREATE', entity: 'Invoice',
    entityId: req.params.id, entityLabel: (cn as any)?.creditNoteNumber ?? '',
    performedBy: req.user!.userId, performedByRole: req.user!.role,
    ipAddress: req.ip ?? '',
    summary: `Issued credit note ${(cn as any)?.creditNoteNumber ?? ''} for invoice (full refund)`,
  });

  return ApiResponse.created(res, cn, 'Credit note issued successfully');
});

export const getCreditNote = asyncHandler(async (req: Request, res: Response) => {
  const cn = await CreditNoteService.findById(req.clinicId!, req.params.cnId);
  return ApiResponse.success(res, cn);
});
