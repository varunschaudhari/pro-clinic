import { Types } from 'mongoose';
import { CreditNote } from '../models/CreditNote.model';
import { Invoice } from '../models/Invoice.model';
import { nextSeq } from '../models/Counter.model';
import { ApiError } from '../utils/ApiError';

const PATIENT_FIELDS = 'name mobile email gender age ageUnit patientId';
const USER_FIELDS    = 'name';

function toCNResponse(doc: Record<string, unknown> | null) {
  if (!doc) return doc;
  const { patientId, ...rest } = doc;
  return { ...rest, patient: patientId };
}

export interface IssueRefundInput {
  reason:               string;
  refundMode:           string;
  refundTransactionId?: string;
}

export class CreditNoteService {
  static async issueRefund(
    clinicId:  Types.ObjectId,
    invoiceId: string,
    input:     IssueRefundInput,
    userId:    Types.ObjectId
  ) {
    const inv = await Invoice.findOne({ _id: invoiceId, clinicId });
    if (!inv)                               throw ApiError.notFound('Invoice not found');
    if (inv.isCancelled)                    throw ApiError.badRequest('Cannot refund a cancelled invoice');
    if (inv.paidAmount <= 0)               throw ApiError.badRequest('Invoice has no recorded payments to refund');
    if (inv.paymentStatus === 'refunded')   throw ApiError.badRequest('Invoice has already been refunded');

    const seq              = await nextSeq(clinicId, 'creditNote');
    const year             = new Date().getFullYear();
    const creditNoteNumber = `CN-${year}-${String(seq).padStart(4, '0')}`;

    const cn = await CreditNote.create({
      clinicId,
      creditNoteNumber,
      invoiceId:           new Types.ObjectId(invoiceId),
      invoiceNumber:       inv.invoiceNumber,
      patientId:           inv.patientId,
      amount:              inv.paidAmount,
      reason:              input.reason,
      refundMode:          input.refundMode,
      refundTransactionId: input.refundTransactionId,
      issuedBy:            userId,
      issuedAt:            new Date(),
    });

    // Use findByIdAndUpdate to bypass the pre-save hook (which would reset paymentStatus)
    await Invoice.findByIdAndUpdate(invoiceId, {
      $set: {
        paymentStatus: 'refunded',
        creditNoteId:  cn._id,
        refundedAt:    new Date(),
      },
    });

    return CreditNoteService.findById(clinicId, cn._id.toString());
  }

  static async findById(clinicId: Types.ObjectId, id: string) {
    const cn = await CreditNote.findOne({ _id: id, clinicId })
      .populate('patientId', PATIENT_FIELDS)
      .populate('issuedBy',  USER_FIELDS)
      .lean();
    if (!cn) throw ApiError.notFound('Credit note not found');
    return toCNResponse(cn as Record<string, unknown>);
  }
}
