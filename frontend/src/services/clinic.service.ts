import api from '@/lib/axios';
import type { ApiResponse } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClinicAddress {
  line1:   string;
  line2?:  string;
  city:    string;
  state:   string;
  pincode: string;
  country: string;
}

export interface ClinicSettings {
  currency:            string;
  timezone:            string;
  dateFormat:          string;
  appointmentDuration: number;
  workingDays:         number[];
  workingHours:        { start: string; end: string };
  enableSMS:           boolean;
  enableWhatsApp:      boolean;
  enableOnlineBooking: boolean;
  tokenPrefix:         string;
  invoicePrefix:       string;
  patientIdPrefix:     string;
  printHeader?:        string;
  printFooter?:        string;
}

export interface ClinicBankAccount {
  accountHolderName?: string;
  bankName?:          string;
  accountNumber?:     string;
  ifscCode?:          string;
  upiId?:             string;
}

export interface ClinicDoc {
  _id:                string;
  name:               string;
  slug:               string;
  type:               string;
  registrationNumber?: string;
  gstin?:             string;
  address:            ClinicAddress;
  mobile:             string;
  alternateMobile?:   string;
  email:              string;
  website?:           string;
  logoUrl?:           string;
  bankAccount?:       ClinicBankAccount;
  settings:           ClinicSettings;
  isActive:           boolean;
  createdAt:          string;
  updatedAt:          string;
}

/** Minimal shape used by all print views */
export interface ClinicPrintInfo {
  name:               string;
  type?:              string;
  address?:           ClinicAddress;
  mobile?:            string;
  email?:             string;
  website?:           string;
  logoUrl?:           string;
  gstin?:             string;
  registrationNumber?:string;
  bankAccount?:       ClinicBankAccount;
  settings?: {
    printHeader?: string;
    printFooter?: string;
  };
}

export interface UpdateClinicPayload {
  name?:               string;
  type?:               string;
  registrationNumber?: string;
  gstin?:              string;
  logoUrl?:            string;
  mobile?:             string;
  alternateMobile?:    string;
  email?:              string;
  website?:            string;
  address?: Partial<ClinicAddress>;
  settings?: Partial<ClinicSettings>;
  bankAccount?: Partial<ClinicBankAccount>;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const clinicApi = {
  get:    ()                          => api.get<ApiResponse<ClinicDoc>>('/settings'),
  update: (data: UpdateClinicPayload) => api.patch<ApiResponse<ClinicDoc>>('/settings', data),

  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append('logo', file);
    return api.post<ApiResponse<{ logoUrl: string; clinic: ClinicDoc }>>('/settings/logo', form);
  },
};
