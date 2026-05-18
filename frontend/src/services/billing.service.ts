import api from '@/lib/axios';
import type { ApiResponse, PaginatedResponse } from '@/types';
import type { PaymentMode, InvoiceItemType } from '@/constants/billing';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded';

export interface InvoicePatient {
  _id: string;
  patientId: string;
  name: string;
  mobile: string;
  gender: string;
  age?: number;
  ageUnit?: string;
}

export interface InvoiceItem {
  _id?: string;
  type: InvoiceItemType;
  description: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
  referenceId?: string;
}

export interface InvoicePayment {
  amount: number;
  mode: PaymentMode;
  transactionId?: string;
  paidAt: string;
  receivedBy: { _id: string; name: string };
  notes?: string;
}

export interface InvoiceDoc {
  _id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  patient: InvoicePatient;
  appointmentId?: string;
  items: InvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  totalTaxableAmount: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  roundOff: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  payments: InvoicePayment[];
  isInterState: boolean;
  clinicGstin?: string;
  patientGstin?: string;
  createdBy: { _id: string; name: string };
  notes?: string;
  termsAndConditions?: string;
  isCancelled: boolean;
  cancelledAt?: string;
  cancellationReason?: string;
  createdAt: string;
}

export interface BillingStats {
  totalReceivable: number;
  totalCollected: number;
  pendingCount: number;
  partialCount: number;
  todayAmount: number;
  todayCount: number;
}

export interface CreateInvoicePayload {
  patientId: string;
  appointmentId?: string;
  items: {
    type: InvoiceItemType;
    description: string;
    hsnCode?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    gstRate?: number;
    referenceId?: string;
  }[];
  isInterState?: boolean;
  clinicGstin?: string;
  patientGstin?: string;
  notes?: string;
  termsAndConditions?: string;
  dueDate?: string;
}

export interface RecordPaymentPayload {
  amount: number;
  mode: PaymentMode;
  transactionId?: string;
  notes?: string;
}

export interface ListInvoicesParams {
  patientId?: string;
  appointmentId?: string;
  paymentStatus?: PaymentStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const billingApi = {
  list: (params?: ListInvoicesParams) =>
    api.get<PaginatedResponse<InvoiceDoc>>('/billing', { params }),

  stats: () =>
    api.get<ApiResponse<BillingStats>>('/billing/stats'),

  get: (id: string) =>
    api.get<ApiResponse<InvoiceDoc>>(`/billing/${id}`),

  create: (data: CreateInvoicePayload) =>
    api.post<ApiResponse<InvoiceDoc>>('/billing', data),

  recordPayment: (id: string, data: RecordPaymentPayload) =>
    api.post<ApiResponse<InvoiceDoc>>(`/billing/${id}/payment`, data),

  cancel: (id: string, reason: string) =>
    api.post<ApiResponse<InvoiceDoc>>(`/billing/${id}/cancel`, { reason }),

  delete: (id: string) =>
    api.delete(`/billing/${id}`),
};

// ── Client-side GST computation (mirrors server logic) ────────────────────────

export interface ComputedItem {
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export function computeItemAmounts(
  unitPrice: number,
  quantity: number,
  discount: number,
  gstRate: number,
  isInterState: boolean
): ComputedItem {
  const taxableAmount = parseFloat(((unitPrice * quantity) - discount).toFixed(2));
  const gstAmount     = parseFloat((taxableAmount * gstRate / 100).toFixed(2));
  const cgstAmount    = isInterState ? 0 : parseFloat((gstAmount / 2).toFixed(2));
  const sgstAmount    = isInterState ? 0 : parseFloat((gstAmount / 2).toFixed(2));
  const igstAmount    = isInterState ? gstAmount : 0;
  const totalAmount   = parseFloat((taxableAmount + cgstAmount + sgstAmount + igstAmount).toFixed(2));
  return { taxableAmount, cgstAmount, sgstAmount, igstAmount, totalAmount };
}

export interface InvoiceTotals {
  subtotal: number;
  totalDiscount: number;
  totalTaxableAmount: number;
  totalCGST: number;
  totalSGST: number;
  totalIGST: number;
  roundOff: number;
  totalAmount: number;
}

export function computeInvoiceTotals(
  items: Array<{
    unitPrice: number;
    quantity: number;
    discount: number;
    gstRate: number;
  }>,
  isInterState: boolean
): InvoiceTotals {
  const computed = items.map((i) =>
    computeItemAmounts(i.unitPrice, i.quantity, i.discount, i.gstRate, isInterState)
  );

  const subtotal           = parseFloat(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toFixed(2));
  const totalDiscount      = parseFloat(items.reduce((s, i) => s + i.discount, 0).toFixed(2));
  const totalTaxableAmount = parseFloat(computed.reduce((s, i) => s + i.taxableAmount, 0).toFixed(2));
  const totalCGST          = parseFloat(computed.reduce((s, i) => s + i.cgstAmount, 0).toFixed(2));
  const totalSGST          = parseFloat(computed.reduce((s, i) => s + i.sgstAmount, 0).toFixed(2));
  const totalIGST          = parseFloat(computed.reduce((s, i) => s + i.igstAmount, 0).toFixed(2));
  const rawTotal           = totalTaxableAmount + totalCGST + totalSGST + totalIGST;
  const roundedTotal       = Math.round(rawTotal);
  const roundOff           = parseFloat((roundedTotal - rawTotal).toFixed(2));

  return { subtotal, totalDiscount, totalTaxableAmount, totalCGST, totalSGST, totalIGST, roundOff, totalAmount: roundedTotal };
}
