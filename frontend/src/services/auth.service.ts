import api from '../lib/axios';
import type { AuthUser, ApiResponse, PaginatedResponse, Role } from '../types';

// ── Staff member shape returned by GET /users ─────────────────────────────────
export interface StaffMember {
  _id: string;
  name: string;
  mobile: string;
  email?: string;
  role: Role;
  specialization?: string;
  licenseNumber?: string;
  consultationFee?: number;
  isActive: boolean;
  isInviteAccepted: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface ListStaffParams {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
  isActive?: boolean;
}

export interface UpdateStaffPayload {
  isActive?: boolean;
  specialization?: string;
  licenseNumber?: string;
  consultationFee?: number;
}

export interface LoginPayload {
  mobile: string;
  password: string;
}

export interface RegisterPayload {
  clinicName: string;
  clinicType: string;
  clinicMobile: string;
  clinicEmail: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  adminName: string;
  adminMobile: string;
  adminEmail?: string;
  adminPassword: string;
}

export interface InvitePayload {
  name: string;
  mobile: string;
  email?: string;
  role: 'Doctor' | 'Receptionist' | 'Pharmacist';
  specialization?: string;
  licenseNumber?: string;
  consultationFee?: number;
}

export interface AcceptInvitePayload {
  token: string;
  password: string;
  name?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  bio?: string;
  specialization?: string;
  licenseNumber?: string;
  consultationFee?: number;
  qualifications?: string[];
}

export type MeResponse = AuthUser & { clinicName?: string | null };

export const authApi = {
  login: (data: LoginPayload) =>
    api.post<ApiResponse<{ user: AuthUser }>>('/auth/login', data),

  register: (data: RegisterPayload) =>
    api.post<ApiResponse<{ user: AuthUser; clinic: { id: string; name: string; slug: string } }>>(
      '/auth/register',
      data
    ),

  logout: () => api.post('/auth/logout'),

  getMe: () => api.get<ApiResponse<MeResponse>>('/auth/me'),

  refreshToken: () => api.post('/auth/refresh'),

  inviteUser: (data: InvitePayload) =>
    api.post<ApiResponse<{ inviteToken: string; user: { id: string; name: string; role: string } }>>(
      '/auth/invite',
      data
    ),

  acceptInvite: (data: AcceptInvitePayload) =>
    api.post<ApiResponse<{ user: AuthUser }>>('/auth/invite/accept', data),

  changePassword: (data: ChangePasswordPayload) =>
    api.put('/auth/change-password', data),

  updateProfile: (data: UpdateProfilePayload) =>
    api.put<ApiResponse<AuthUser>>('/auth/profile', data),
};

export const usersApi = {
  listStaff: (params?: ListStaffParams) =>
    api.get<PaginatedResponse<StaffMember>>('/users', { params }),

  getStaffMember: (userId: string) =>
    api.get<ApiResponse<StaffMember>>(`/users/${userId}`),

  updateStaff: (userId: string, data: UpdateStaffPayload) =>
    api.patch<ApiResponse<StaffMember>>(`/users/${userId}`, data),

  resendInvite: (userId: string) =>
    api.post<ApiResponse<{ inviteToken: string }>>(`/users/${userId}/resend-invite`),

  removeStaff: (userId: string) =>
    api.delete(`/users/${userId}`),
};
