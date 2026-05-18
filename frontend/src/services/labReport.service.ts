import api from '@/lib/axios';
import type { ApiResponse, PaginatedResponse } from '@/types';
import type { LabStatus } from '@/constants/labReport';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LabResult {
  parameter: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal?: boolean;
  flags?: 'H' | 'L' | 'HH' | 'LL' | 'A';
}

export interface LabReportPatient {
  _id: string;
  patientId: string;
  name: string;
  mobile: string;
  gender: string;
  age?: number;
  ageUnit?: string;
}

export interface LabReportDoctor {
  _id: string;
  name: string;
}

export interface LabReportDoc {
  _id: string;
  reportNumber: string;
  testName: string;
  testCategory?: string;
  labName?: string;
  labAddress?: string;
  labContactNo?: string;
  sampleType?: string;
  sampleCollectedAt?: string;
  reportDate: string;
  results: LabResult[];
  interpretation?: string;
  remarks?: string;
  doctorComment?: string;
  fileUrls: string[];
  status: LabStatus;
  patient: LabReportPatient;
  orderedBy: LabReportDoctor;
  appointmentId?: string;
  prescriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLabReportPayload {
  patientId: string;
  appointmentId?: string;
  prescriptionId?: string;
  testName: string;
  testCategory?: string;
  labName?: string;
  labAddress?: string;
  labContactNo?: string;
  sampleType?: string;
  sampleCollectedAt?: string;
  reportDate?: string;
  results?: LabResult[];
  interpretation?: string;
  remarks?: string;
  doctorComment?: string;
  fileUrls?: string[];
  status?: LabStatus;
}

export type UpdateLabReportPayload = Omit<CreateLabReportPayload, 'patientId'>;

export interface UpdateLabStatusPayload {
  status: LabStatus;
  remarks?: string;
}

export interface ListLabReportsParams {
  patientId?: string;
  appointmentId?: string;
  prescriptionId?: string;
  status?: LabStatus;
  page?: number;
  limit?: number;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const labApi = {
  list: (params?: ListLabReportsParams) =>
    api.get<PaginatedResponse<LabReportDoc>>('/lab', { params }),

  get: (id: string) =>
    api.get<ApiResponse<LabReportDoc>>(`/lab/${id}`),

  create: (data: CreateLabReportPayload) =>
    api.post<ApiResponse<LabReportDoc>>('/lab', data),

  update: (id: string, data: UpdateLabReportPayload) =>
    api.put<ApiResponse<LabReportDoc>>(`/lab/${id}`, data),

  updateStatus: (id: string, data: UpdateLabStatusPayload) =>
    api.patch<ApiResponse<LabReportDoc>>(`/lab/${id}/status`, data),

  delete: (id: string) =>
    api.delete(`/lab/${id}`),

  uploadFile: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<ApiResponse<{ url: string; fileUrls: string[] }>>(`/lab/${id}/files`, form);
  },

  deleteFile: (id: string, url: string) =>
    api.delete<ApiResponse<{ fileUrls: string[] }>>(`/lab/${id}/files`, { data: { url } }),
};
