import api from '@/lib/axios';
import type { ApiResponse } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DoctorScheduleDay {
  _id?: string;
  dayOfWeek: number; // 0=Sun … 6=Sat
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  slotDurationMinutes: number;
  maxPatientsPerSlot: number;
  isActive: boolean;
}

export interface SlotInfo {
  slotStart: string;
  slotEnd: string;
  available: boolean;
  bookedCount: number;
  maxPatientsPerSlot: number;
  reason: 'past' | 'leave' | 'full' | null;
}

export interface AvailabilityResult {
  available: boolean;
  reason?: 'not_scheduled' | 'on_leave';
  slotDurationMinutes?: number;
  slots: SlotInfo[];
}

export interface DoctorLeave {
  _id: string;
  date: string;
  isFullDay: boolean;
  startTime?: string;
  endTime?: string;
  reason?: string;
  createdAt: string;
}

export interface DoctorWithSchedule {
  _id: string;
  name: string;
  specialization?: string;
  avatarUrl?: string;
  activeDays: number[];
}

export interface UpsertSchedulePayload {
  days: DoctorScheduleDay[];
}

export interface AddLeavePayload {
  date: string;
  isFullDay: boolean;
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface AddLeaveResult {
  leave: DoctorLeave;
  hasConflict: boolean;
}

export interface AddLeaveRangePayload {
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface AddLeaveRangeResult {
  created: number;
  skipped: number;
  hasConflict: boolean;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const scheduleApi = {
  listDoctors: () =>
    api.get<ApiResponse<DoctorWithSchedule[]>>('/schedule/doctors'),

  getSchedule: (doctorId: string) =>
    api.get<ApiResponse<DoctorScheduleDay[]>>(`/schedule/doctors/${doctorId}`),

  upsertSchedule: (doctorId: string, data: UpsertSchedulePayload) =>
    api.put<ApiResponse<DoctorScheduleDay[]>>(`/schedule/doctors/${doctorId}`, data),

  getAvailability: (doctorId: string, date: string) =>
    api.get<ApiResponse<AvailabilityResult>>(`/schedule/doctors/${doctorId}/availability`, {
      params: { date },
    }),

  getLeaves: (doctorId: string, from?: string, to?: string) =>
    api.get<ApiResponse<DoctorLeave[]>>(`/schedule/doctors/${doctorId}/leaves`, {
      params: { from, to },
    }),

  addLeave: (doctorId: string, data: AddLeavePayload) =>
    api.post<ApiResponse<AddLeaveResult>>(`/schedule/doctors/${doctorId}/leaves`, data),

  addLeaveRange: (doctorId: string, data: AddLeaveRangePayload) =>
    api.post<ApiResponse<AddLeaveRangeResult>>(`/schedule/doctors/${doctorId}/leaves/range`, data),

  deleteLeave: (doctorId: string, leaveId: string) =>
    api.delete(`/schedule/doctors/${doctorId}/leaves/${leaveId}`),
};
