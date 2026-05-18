import api from '@/lib/axios';
import type { ApiResponse } from '@/types';

export interface VitalSignsDoc {
  _id: string;
  clinicId: string;
  patientId: string;
  appointmentId: string | { _id: string; tokenDisplay: string; appointmentDate: string; slotStart: string };
  recordedBy: { _id: string; name: string };

  bloodPressure?: { systolic: number; diastolic: number };
  pulseRate?: number;
  temperature?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  spo2?: number;
  respiratoryRate?: number;
  bloodSugar?: { value: number; unit: 'mg/dL' | 'mmol/L'; type: string };
  painScale?: number;
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CreateVitalsPayload {
  appointmentId:   string;
  patientId:       string;
  bloodPressure?:  { systolic: number; diastolic: number };
  pulseRate?:      number;
  temperature?:    number;
  weight?:         number;
  height?:         number;
  spo2?:           number;
  respiratoryRate?: number;
  bloodSugar?:     { value: number; unit: 'mg/dL' | 'mmol/L'; type: string };
  painScale?:      number;
  notes?:          string;
}

export type UpdateVitalsPayload = Omit<CreateVitalsPayload, 'appointmentId' | 'patientId'>;

export const vitalsApi = {
  getByAppointment: (appointmentId: string) =>
    api.get<ApiResponse<VitalSignsDoc | null>>(`/vitals/appointment/${appointmentId}`),

  getPatientHistory: (patientId: string, limit = 10) =>
    api.get<ApiResponse<VitalSignsDoc[]>>(`/vitals/patient/${patientId}`, { params: { limit } }),

  create: (data: CreateVitalsPayload) =>
    api.post<ApiResponse<VitalSignsDoc>>('/vitals', data),

  update: (id: string, data: UpdateVitalsPayload) =>
    api.put<ApiResponse<VitalSignsDoc>>(`/vitals/${id}`, data),
};
