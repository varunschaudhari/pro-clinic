import api from '@/lib/axios';
import type { ApiResponse } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PortalMedicine {
  name:          string;
  dosage?:       string;
  frequency?:    string;
  durationValue?: number;
  durationUnit?: string;
  unit?:         string;
  route?:        string;
  instructions?: string;
}

export interface PortalPrescription {
  _id:             string;
  prescriptionNumber: string;
  createdAt:       string;
  doctorId?:       { name: string; specialization?: string } | null;
  diagnosis:       string[];
  medicines:       PortalMedicine[];
  advice?:         string;
  dietAdvice?:     string;
  followUpDate?:   string;
}

export interface PortalLabResult {
  parameter:      string;
  value:          string;
  unit?:          string;
  referenceRange?: string;
  isAbnormal:     boolean;
  flags?:         string;
}

export interface PortalLabReport {
  _id:          string;
  reportNumber: string;
  testName:     string;
  testCategory?: string;
  status:       string;
  reportDate?:  string;
  createdAt:    string;
  orderedBy?:   { name: string } | null;
  results:      PortalLabResult[];
  interpretation?: string;
  remarks?:     string;
  fileUrls:     string[];
}

export interface PortalData {
  clinic: {
    name:     string;
    address?: { line1?: string; city?: string; state?: string };
    mobile?:  string;
    logoUrl?: string;
  };
  patient: {
    name:      string;
    patientId: string;
    age?:      number;
    ageUnit?:  string;
    gender:    string;
    bloodGroup?: string;
    mobile?:   string;
  };
  prescriptions: PortalPrescription[];
  labReports:    PortalLabReport[];
  expiresAt:     string;
}

// ── API ───────────────────────────────────────────────────────────────────────

export const portalApi = {
  /** Public — no auth required */
  getData: (token: string) =>
    api.get<ApiResponse<PortalData>>(`/portal/${token}`),

  /** Authenticated — generate a new portal link for a patient */
  generate: (patientId: string) =>
    api.post<ApiResponse<{ token: string; expiresAt: string }>>('/portal/generate', { patientId }),

  /** Authenticated — revoke the active portal link for a patient */
  revoke: (patientId: string) =>
    api.post<ApiResponse<null>>('/portal/revoke', { patientId }),
};
