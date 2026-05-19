import api from '@/lib/axios';
import type { ApiResponse, PaginatedResponse } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AppointmentPatient {
  _id: string;
  patientId: string;
  name: string;
  mobile: string;
  gender: 'male' | 'female' | 'other';
  dob?: string;
  age?: number;
  ageUnit?: string;
}

export interface AppointmentDoctor {
  _id: string;
  name: string;
}

export type AppointmentStatus =
  | 'scheduled' | 'confirmed' | 'in_progress'
  | 'completed' | 'cancelled' | 'no_show';

export type AppointmentMode = 'walkin' | 'scheduled' | 'teleconsult';
export type VisitType = 'new' | 'followup';

export interface AppointmentItem {
  _id: string;
  tokenNumber: number;
  tokenDisplay: string;
  status: AppointmentStatus;
  mode: AppointmentMode;
  visitType: VisitType;
  appointmentDate: string;
  slotStart: string;
  slotEnd: string;
  chiefComplaint?: string;
  notes?: string;
  patient: AppointmentPatient;
  doctor: AppointmentDoctor;
  createdBy: { _id: string; name: string };
  checkedInAt?: string;
  consultationStartAt?: string;
  consultationEndAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  vitalSignsId?:   string;
  prescriptionId?: string;
  invoiceId?:      string;
  createdAt: string;
}

export interface CreateAppointmentPayload {
  patientId: string;
  doctorId: string;
  appointmentDate: string;      // YYYY-MM-DD
  slotStart?: string;           // HH:MM — optional for walk-ins
  slotEnd?: string;
  mode: AppointmentMode;
  visitType: VisitType;
  chiefComplaint?: string;
  notes?: string;
  followUpFor?: string;
}

export interface UpdateStatusPayload {
  status: Exclude<AppointmentStatus, 'scheduled'>;
  cancellationReason?: string;
}

export interface UpdateAppointmentPayload {
  doctorId?: string;
  appointmentDate?: string;
  slotStart?: string;
  slotEnd?: string;
  mode?: AppointmentMode;
  visitType?: VisitType;
  chiefComplaint?: string;
  notes?: string;
}

export interface ListAppointmentsParams {
  date?: string;         // YYYY-MM-DD
  doctorId?: string;
  patientId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface AppointmentStats {
  scheduled: number;
  confirmed: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  no_show: number;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const appointmentApi = {
  list: (params?: ListAppointmentsParams) =>
    api.get<PaginatedResponse<AppointmentItem>>('/appointments', { params }),

  stats: (date: string, doctorId?: string) =>
    api.get<ApiResponse<AppointmentStats>>('/appointments/stats', {
      params: { date, doctorId },
    }),

  get: (id: string) =>
    api.get<ApiResponse<AppointmentItem>>(`/appointments/${id}`),

  create: (data: CreateAppointmentPayload) =>
    api.post<ApiResponse<AppointmentItem>>('/appointments', data),

  update: (id: string, data: UpdateAppointmentPayload) =>
    api.patch<ApiResponse<AppointmentItem>>(`/appointments/${id}`, data),

  updateStatus: (id: string, data: UpdateStatusPayload) =>
    api.patch<ApiResponse<AppointmentItem>>(`/appointments/${id}/status`, data),

  delete: (id: string) =>
    api.delete(`/appointments/${id}`),
};
