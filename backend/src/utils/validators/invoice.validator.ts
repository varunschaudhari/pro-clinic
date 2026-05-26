import { z } from 'zod';

const objectId = /^[a-f\d]{24}$/i;

const itemSchema = z.object({
  type: z.enum(['consultation', 'medicine', 'lab', 'procedure', 'other']),
  description: z.string().trim().min(1, 'Description required').max(200),
  hsnCode: z.string().trim().max(20).optional(),
  quantity: z.coerce.number().min(0.01, 'Quantity must be > 0'),
  unitPrice: z.coerce.number().min(0, 'Unit price must be ≥ 0'),
  discount: z.coerce.number().min(0).default(0),
  gstRate: z.coerce.number().refine((v) => [0, 5, 12, 18, 28].includes(v), {
    message: 'GST rate must be 0, 5, 12, 18, or 28',
  }).default(0),
  referenceId: z.string().regex(objectId).optional(),
});

export const createInvoiceSchema = z.object({
  patientId:          z.string().regex(objectId, 'Invalid patient ID'),
  appointmentId:      z.string().regex(objectId).optional(),
  category:           z.enum(['clinic', 'pharmacy']).default('clinic'),
  items:              z.array(itemSchema).min(1, 'At least one item required'),
  isInterState:       z.boolean().default(false),
  clinicGstin:        z.string().trim().optional(),
  patientGstin:       z.string().trim().optional(),
  notes:              z.string().trim().max(500).optional(),
  termsAndConditions: z.string().trim().max(500).optional(),
  dueDate:            z.string().optional(),
});

export const recordPaymentSchema = z.object({
  amount:        z.coerce.number().min(0.01, 'Amount must be > 0'),
  mode:          z.enum(['cash', 'card', 'upi', 'netbanking', 'insurance', 'other']),
  transactionId: z.string().trim().optional(),
  notes:         z.string().trim().optional(),
});

export const cancelInvoiceSchema = z.object({
  reason: z.string().trim().min(1, 'Reason required').max(300),
});

export const listInvoicesSchema = z.object({
  patientId:     z.string().regex(objectId).optional(),
  appointmentId: z.string().regex(objectId).optional(),
  category:      z.enum(['clinic', 'pharmacy']).optional(),
  paymentStatus: z.enum(['pending', 'partial', 'paid', 'refunded']).optional(),
  fromDate:      z.string().optional(),
  toDate:        z.string().optional(),
  page:          z.coerce.number().int().min(1).default(1),
  limit:         z.coerce.number().int().min(1).max(100).default(20),
});

export const issueRefundSchema = z.object({
  reason:              z.string().trim().min(1, 'Reason required').max(500),
  refundMode:          z.enum(['cash', 'upi', 'bank_transfer', 'other']),
  refundTransactionId: z.string().trim().optional(),
});

export type IssueRefundInput = z.infer<typeof issueRefundSchema>;

export const updateInvoiceSchema = z.object({
  items:              z.array(itemSchema).min(1, 'At least one item required'),
  isInterState:       z.boolean().optional(),
  clinicGstin:        z.string().trim().optional(),
  patientGstin:       z.string().trim().optional(),
  notes:              z.string().trim().max(500).optional(),
  termsAndConditions: z.string().trim().max(500).optional(),
  dueDate:            z.string().optional(),
});

export type CreateInvoiceInput  = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput  = z.infer<typeof updateInvoiceSchema>;
export type RecordPaymentInput  = z.infer<typeof recordPaymentSchema>;
export type CancelInvoiceInput  = z.infer<typeof cancelInvoiceSchema>;
export type ListInvoicesInput   = z.infer<typeof listInvoicesSchema>;
