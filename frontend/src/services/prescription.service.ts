import api from '@/lib/axios';
import type { ApiResponse, PaginatedResponse } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PrescriptionMedicine {
  _id?: string;
  medicineId?: string;
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  duration: string;
  durationDays?: number;
  unit: string;
  route?: string;
  instructions?: string;
  quantity?: number;
  isDispensed?: boolean;
}

export interface PrescriptionLabTest {
  name: string;
  urgency?: 'routine' | 'urgent' | 'stat';
  notes?: string;
}

export interface PrescriptionPatient {
  _id: string;
  patientId: string;
  name: string;
  mobile: string;
  gender: string;
  dob?: string;
  age?: number;
  ageUnit?: string;
}

export interface PrescriptionDoctor {
  _id: string;
  name: string;
}

export interface PrescriptionItem {
  _id: string;
  prescriptionNumber: string;
  appointmentId: string;
  diagnosis: string[];
  icdCodes: string[];
  medicines: PrescriptionMedicine[];
  labTests: PrescriptionLabTest[];
  procedures: string[];
  advice?: string;
  dietAdvice?: string;
  followUpDate?: string;
  followUpInstructions?: string;
  doctorNotes?: string;
  printCount: number;
  printedAt?: string;
  patient: PrescriptionPatient;
  doctor: PrescriptionDoctor;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrescriptionPayload {
  appointmentId: string;
  diagnosis: string[];
  icdCodes?: string[];
  medicines: {
    name: string;
    genericName?: string;
    dosage: string;
    frequency: string;
    duration: string;
    durationDays?: number;
    unit: string;
    route?: string;
    instructions?: string;
    quantity?: number;
  }[];
  labTests?: PrescriptionLabTest[];
  procedures?: string[];
  advice?: string;
  dietAdvice?: string;
  followUpDate?: string;
  followUpInstructions?: string;
  doctorNotes?: string;
}

export type UpdatePrescriptionPayload = Omit<CreatePrescriptionPayload, 'appointmentId'>;

export interface ListPrescriptionsParams {
  patientId?: string;
  appointmentId?: string;
  doctorId?: string;
  page?: number;
  limit?: number;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const prescriptionApi = {
  list: (params?: ListPrescriptionsParams) =>
    api.get<PaginatedResponse<PrescriptionItem>>('/prescriptions', { params }),

  get: (id: string) =>
    api.get<ApiResponse<PrescriptionItem>>(`/prescriptions/${id}`),

  create: (data: CreatePrescriptionPayload) =>
    api.post<ApiResponse<PrescriptionItem>>('/prescriptions', data),

  update: (id: string, data: UpdatePrescriptionPayload) =>
    api.put<ApiResponse<PrescriptionItem>>(`/prescriptions/${id}`, data),

  recordPrint: (id: string) =>
    api.post<ApiResponse<{ printCount: number; printedAt: string }>>(`/prescriptions/${id}/print`),

  delete: (id: string) =>
    api.delete(`/prescriptions/${id}`),
};
