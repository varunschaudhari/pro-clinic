import api from '@/lib/axios';
import type { ApiResponse, PaginatedResponse } from '@/types';
import type { DrugCategory } from '@/constants/pharmacy';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DrugBatch {
  _id: string;
  batchNumber: string;
  expiryDate: string;
  purchasePrice: number;
  mrp: number;
  sellingPrice: number;
  quantity: number;
  purchasedAt?: string;
}

export interface DrugDoc {
  _id: string;
  name: string;
  genericName?: string;
  brand?: string;
  manufacturer?: string;
  category: DrugCategory;
  unit: string;
  packSize?: number;
  currentStock: number;
  reorderLevel: number;
  maxStock?: number;
  batches: DrugBatch[];
  sellingPrice: number;
  mrp: number;
  purchasePrice: number;
  hsnCode?: string;
  gstRate: number;
  isgstExempt: boolean;
  schedule?: string;
  requiresPrescription: boolean;
  location?: string;
  notes?: string;
  isActive: boolean;
  isLowStock: boolean;
  nearExpiryBatches: DrugBatch[];
  createdAt: string;
  updatedAt: string;
}

export interface StockTransactionWithDrug extends StockTransactionDoc {
  drug?: { _id: string; name: string; unit: string };
}

export interface AllTransactionsParams {
  page?: number;
  limit?: number;
  type?: string;
  drugId?: string;
  startDate?: string;
  endDate?: string;
}

export interface StockTransactionDoc {
  _id: string;
  drugId: string;
  type: string;
  quantity: number;
  quantityBefore: number;
  quantityAfter: number;
  unitPrice?: number;
  batchNumber?: string;
  expiryDate?: string;
  prescriptionId?: string;
  patientId?: string;
  notes?: string;
  createdBy: { _id: string; name: string };
  createdAt: string;
}

export interface DrugWithTransactions extends DrugDoc {
  recentTransactions: StockTransactionDoc[];
}

export interface PharmacyStats {
  totalDrugs: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryValue: number;
  nearExpiryCount: number;
}

export interface CreateDrugPayload {
  name: string;
  genericName?: string;
  brand?: string;
  manufacturer?: string;
  category: DrugCategory;
  unit: string;
  packSize?: number;
  sellingPrice: number;
  mrp: number;
  purchasePrice?: number;
  hsnCode?: string;
  gstRate?: number;
  schedule?: string;
  requiresPrescription?: boolean;
  reorderLevel?: number;
  maxStock?: number;
  location?: string;
  notes?: string;
  initialQuantity?: number;
  initialBatchNumber?: string;
  initialExpiryDate?: string;
}

export type UpdateDrugPayload = Partial<Omit<CreateDrugPayload, 'initialQuantity' | 'initialBatchNumber' | 'initialExpiryDate'>>;

export interface StockInPayload {
  quantity: number;
  batchNumber?: string;
  expiryDate?: string;
  purchasePrice?: number;
  mrp?: number;
  sellingPrice?: number;
  notes?: string;
}

export interface StockOutPayload {
  quantity: number;
  type?: 'expired' | 'adjustment';
  batchNumber?: string;
  notes?: string;
}

export interface DispensePayload {
  items: { drugId: string; quantity: number }[];
  prescriptionId?: string;
  patientId?: string;
  notes?: string;
}

export interface ListDrugsParams {
  search?: string;
  category?: DrugCategory;
  lowStock?: boolean;
  page?: number;
  limit?: number;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const pharmacyApi = {
  list: (params?: ListDrugsParams) =>
    api.get<PaginatedResponse<DrugDoc>>('/pharmacy', { params }),

  stats: () =>
    api.get<ApiResponse<PharmacyStats>>('/pharmacy/stats'),

  get: (id: string) =>
    api.get<ApiResponse<DrugWithTransactions>>(`/pharmacy/${id}`),

  create: (data: CreateDrugPayload) =>
    api.post<ApiResponse<DrugDoc>>('/pharmacy', data),

  update: (id: string, data: UpdateDrugPayload) =>
    api.put<ApiResponse<DrugDoc>>(`/pharmacy/${id}`, data),

  delete: (id: string) =>
    api.delete(`/pharmacy/${id}`),

  stockIn: (id: string, data: StockInPayload, type?: string) =>
    api.post<ApiResponse<DrugDoc>>(`/pharmacy/${id}/stock-in`, data, {
      params: type ? { type } : undefined,
    }),

  stockOut: (id: string, data: StockOutPayload) =>
    api.post<ApiResponse<DrugDoc>>(`/pharmacy/${id}/stock-out`, data),

  dispense: (data: DispensePayload) =>
    api.post<ApiResponse<{ dispensed: number }>>('/pharmacy/dispense', data),

  transactions: (id: string, params?: { page?: number; limit?: number; type?: string }) =>
    api.get<PaginatedResponse<StockTransactionDoc>>(`/pharmacy/${id}/transactions`, { params }),

  allTransactions: (params?: AllTransactionsParams) =>
    api.get<PaginatedResponse<StockTransactionWithDrug>>('/pharmacy/transactions', { params }),
};
