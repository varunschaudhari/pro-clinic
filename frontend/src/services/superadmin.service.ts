import api from '@/lib/axios';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClinicSubscription {
  plan:        'trial' | 'basic' | 'professional' | 'enterprise';
  status:      'active' | 'inactive' | 'expired' | 'suspended';
  startDate:   string;
  endDate:     string;
  maxDoctors:  number;
  maxPatients: number;
}

export interface ClinicListItem {
  _id:          string;
  name:         string;
  slug:         string;
  type:         string;
  mobile:       string;
  email:        string;
  address:      { line1: string; city: string; state: string; pincode: string };
  subscription: ClinicSubscription;
  isActive:     boolean;
  createdAt:    string;
}

export interface ClinicStaffMember {
  _id:       string;
  name:      string;
  mobile:    string;
  email:     string;
  role:      string;
  isActive:  boolean;
  createdAt: string;
}

export interface ClinicDetail extends ClinicListItem {
  registrationNumber?: string;
  gstin?:              string;
  website?:            string;
  settings?:           Record<string, unknown>;
}

export interface ClinicDetailResponse {
  clinic: ClinicDetail;
  staff:  ClinicStaffMember[];
  usage:  {
    totalPatients:          number;
    totalAppointments:      number;
    appointmentsLast30Days: number;
  };
}

export interface PlatformAnalytics {
  clinics: {
    total:     number;
    active:    number;
    trial:     number;
    expired:   number;
    suspended: number;
    inactive:  number;
  };
  patients:         number;
  appointments:     number;
  planDistribution: { plan: string; count: number }[];
  recentClinics:    Pick<ClinicListItem, '_id' | 'name' | 'slug' | 'type' | 'subscription' | 'isActive' | 'createdAt'>[];
}

export interface ClinicListResponse {
  data:  ClinicListItem[];
  total: number;
  page:  number;
  pages: number;
}

export interface CreateClinicPayload {
  name:              string;
  type:              string;
  mobile:            string;
  email:             string;
  website?:          string;
  address: {
    line1:   string;
    line2?:  string;
    city:    string;
    state:   string;
    pincode: string;
  };
  registrationNumber?: string;
  gstin?:              string;
  plan:                string;
  endDate:             string;
  maxDoctors:          number;
  maxPatients:         number;
  adminName:           string;
  adminMobile:         string;
  adminEmail:          string;
  adminPassword:       string;
}

// ── API ───────────────────────────────────────────────────────────────────────

type Wrap<T> = { success: boolean; data: T };

export const superadminApi = {
  getAnalytics: () =>
    api.get<Wrap<PlatformAnalytics>>('/superadmin/analytics'),

  listClinics: (params?: { search?: string; status?: string; plan?: string; page?: number; limit?: number }) =>
    api.get<Wrap<ClinicListResponse>>('/superadmin/clinics', { params }),

  getClinic: (id: string) =>
    api.get<Wrap<ClinicDetailResponse>>(`/superadmin/clinics/${id}`),

  createClinic: (payload: CreateClinicPayload) =>
    api.post<Wrap<{ clinic: ClinicDetail }>>('/superadmin/clinics', payload),

  updateSubscription: (id: string, payload: Partial<Pick<ClinicSubscription, 'plan' | 'status' | 'endDate' | 'maxDoctors' | 'maxPatients'>>) =>
    api.patch<Wrap<ClinicDetail>>(`/superadmin/clinics/${id}/subscription`, payload),

  toggleStatus: (id: string) =>
    api.patch<Wrap<{ isActive: boolean; subscriptionStatus: string }>>(`/superadmin/clinics/${id}/status`),
};
