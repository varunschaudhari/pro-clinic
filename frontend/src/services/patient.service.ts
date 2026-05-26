import api from '@/lib/axios';
import type { ApiResponse, PaginatedResponse } from '@/types';

export interface PatientListItem {
  _id: string;
  patientId: string;
  name: string;
  mobile: string;
  gender: 'male' | 'female' | 'other';
  dob?: string;
  age?: number;
  ageUnit?: string;
  bloodGroup?: string;
  visitCount: number;
  lastVisitDate?: string;
  totalOutstanding: number;
  isActive: boolean;
  createdAt: string;
}

export interface PatientDetail extends PatientListItem {
  alternateMobile?: string;
  email?: string;
  height?: number;
  weight?: number;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
  emergencyContact?: {
    name: string;
    mobile: string;
    relation: string;
  };
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  insurance?: {
    provider: string;
    policyNumber: string;
    validTill?: string;
  };
  aadharLast4?: string;
  abhaId?: string;
  source?: string;
  notes?: string;
  referredBy?: { name: string; role: string; specialization?: string };
}

export interface CreatePatientPayload {
  name: string;
  mobile: string;
  gender: string;
  alternateMobile?: string;
  email?: string;
  dob?: string;
  age?: number;
  ageUnit?: string;
  bloodGroup?: string;
  height?: number;
  weight?: number;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  emergencyName?: string;
  emergencyMobile?: string;
  emergencyRelation?: string;
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string[];
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceValidTill?: string;
  aadharLast4?: string;
  abhaId?: string;
  source?:   string;
  notes?:    string;
  smsOptIn?: boolean;
}

export type UpdatePatientPayload = Partial<CreatePatientPayload>;

export interface ListPatientsParams {
  page?: number;
  limit?: number;
  search?: string;
  gender?: string;
  bloodGroup?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const patientApi = {
  list: (params?: ListPatientsParams) =>
    api.get<PaginatedResponse<PatientListItem>>('/patients', { params }),

  search: (q: string, limit = 10) =>
    api.get<ApiResponse<PatientListItem[]>>('/patients/search', { params: { q, limit } }),

  get: (patientId: string) =>
    api.get<ApiResponse<PatientDetail>>(`/patients/${patientId}`),

  create: (data: CreatePatientPayload) =>
    api.post<ApiResponse<PatientDetail>>('/patients', data),

  update: (patientId: string, data: UpdatePatientPayload) =>
    api.put<ApiResponse<PatientDetail>>(`/patients/${patientId}`, data),

  delete: (patientId: string) =>
    api.delete(`/patients/${patientId}`),
};
