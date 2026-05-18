import api from '@/lib/axios';

export type ReportPeriod = 'week' | 'month' | 'quarter' | 'year';

export interface RevenueReport {
  summary: {
    totalBilled:      number;
    totalCollected:   number;
    totalOutstanding: number;
    invoiceCount:     number;
  };
  monthlyTrend: { month: string; label: string; billed: number; collected: number; count: number }[];
  byPaymentMode: { mode: string; amount: number; count: number }[];
  topServices:   { description: string; type: string; revenue: number; count: number }[];
}

export interface PatientsReport {
  summary: { total: number; newThisPeriod: number };
  monthlyNewPatients: { month: string; label: string; count: number }[];
  byGender: { gender: string; count: number }[];
  byDoctor: { doctorId: string; name: string; appointments: number; uniquePatients: number; completed: number }[];
}

export interface AppointmentsReport {
  summary: { total: number; completed: number; cancelled: number; completionRate: number };
  dailyTrend:  { date: string; label: string; total: number; completed: number }[];
  byStatus:    { status: string; count: number }[];
  byVisitType: { visitType: string; count: number }[];
  byDoctor:    { doctorId: string; name: string; total: number; completed: number; cancelled: number }[];
}

export interface InventoryReport {
  summary: {
    totalItems: number; totalValue: number; lowStockCount: number;
    outOfStockCount: number; nearExpiryCount: number;
  };
  byCategory:       { category: string; count: number; value: number; units: number }[];
  lowStockItems:    { _id: string; name: string; currentStock: number; reorderLevel: number; unit: string; category: string }[];
  nearExpiryBatches: { _id: string; name: string; batchNumber: string; expiryDate: string; quantity: number }[];
}

export interface ExportReportData {
  type:    string;
  headers: string[];
  rows:    (string | number)[][];
}

type ApiWrap<T> = { success: true; data: T };

const params = (period: ReportPeriod) => ({ params: { period } });

export const reportsApi = {
  revenue:      (period: ReportPeriod) => api.get<ApiWrap<RevenueReport>>('/reports/revenue', params(period)),
  patients:     (period: ReportPeriod) => api.get<ApiWrap<PatientsReport>>('/reports/patients', params(period)),
  appointments: (period: ReportPeriod) => api.get<ApiWrap<AppointmentsReport>>('/reports/appointments', params(period)),
  inventory:    ()                     => api.get<ApiWrap<InventoryReport>>('/reports/inventory'),

  export: (type: string, period?: ReportPeriod) =>
    api.get<ApiWrap<ExportReportData>>('/reports/export', {
      params: { type, ...(period ? { period } : {}) },
    }),
};
