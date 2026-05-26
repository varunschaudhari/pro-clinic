import api from '@/lib/axios';
import type { ApiResponse } from '@/types';

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

export interface DayEndTransaction {
  invoiceId:     string;
  invoiceNumber: string;
  patientName:   string;
  paidAt:        string;
  mode:          string;
  amount:        number;
  transactionId?: string;
}

export interface DayEndReport {
  date:         string;
  totalAmount:  number;
  totalCount:   number;
  byMode:       { mode: string; amount: number; count: number }[];
  transactions: DayEndTransaction[];
}

export interface GstReportRow {
  hsnCode:      string;
  gstRate:      number;
  taxableValue: number;
  cgstAmount:   number;
  sgstAmount:   number;
  igstAmount:   number;
  totalTax:     number;
  totalAmount:  number;
  itemCount:    number;
}

export interface GstReport {
  month:        string;
  invoiceCount: number;
  rows:         GstReportRow[];
  summary: {
    taxableValue: number;
    cgstAmount:   number;
    sgstAmount:   number;
    igstAmount:   number;
    totalTax:     number;
    totalAmount:  number;
  };
}

export interface DoctorPerformanceDoctor {
  doctorId:           string;
  name:               string;
  consultations:      number;
  uniquePatients:     number;
  completed:          number;
  completionRate:     number;
  revenueBilled:      number;
  revenueCollected:   number;
  invoiceCount:       number;
  avgBilledPerPatient: number;
}

export interface DoctorPerformanceReport {
  summary: {
    totalDoctors:       number;
    totalConsultations: number;
    totalRevenue:       number;
  };
  doctors: DoctorPerformanceDoctor[];
}

export interface InventoryValuationItem {
  _id:          string;
  name:         string;
  category:     string;
  currentStock: number;
  reorderLevel: number;
  unit:         string;
  sellingPrice: number;
  stockValue:   number;
  isLowStock:   boolean;
  isOutOfStock: boolean;
}

export interface InventoryValuationReport {
  summary: {
    totalSKUs:       number;
    totalUnits:      number;
    totalValue:      number;
    inStockCount:    number;
    outOfStockCount: number;
  };
  byCategory: { category: string; count: number; totalUnits: number; totalValue: number }[];
  items:      InventoryValuationItem[];
  snapshotAt: string;
}

export interface OpdRegisterRow {
  _id:             string;
  tokenDisplay:    string;
  slotStart:       string;
  patientName:     string;
  patientId:       string;
  mobile:          string;
  gender:          string;
  dob:             string | null;
  age:             number | null;
  ageUnit:         string | null;
  doctorName:      string;
  mode:            string;
  visitType:       string;
  chiefComplaint:  string;
  status:          string;
  hasVitals:       boolean;
  hasPrescription: boolean;
  hasInvoice:      boolean;
}

export interface OpdRegister {
  date:  string;
  count: number;
  rows:  OpdRegisterRow[];
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
  dayEnd:       (date: string)         => api.get<ApiResponse<DayEndReport>>('/billing/day-end', { params: { date } }),

  gstReport: (month: string) =>
    api.get<ApiWrap<GstReport>>('/reports/gst', { params: { month } }),

  export: (type: string, period?: ReportPeriod) =>
    api.get<ApiWrap<ExportReportData>>('/reports/export', {
      params: { type, ...(period ? { period } : {}) },
    }),

  doctorPerformance: (period: ReportPeriod) =>
    api.get<ApiWrap<DoctorPerformanceReport>>('/reports/doctor-performance', params(period)),

  inventoryValuation: () =>
    api.get<ApiWrap<InventoryValuationReport>>('/reports/inventory-valuation'),

  opdRegister: (date: string, doctorId?: string) =>
    api.get<ApiWrap<OpdRegister>>('/reports/opd-register', {
      params: { date, ...(doctorId ? { doctorId } : {}) },
    }),
};
