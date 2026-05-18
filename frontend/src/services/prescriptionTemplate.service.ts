import api from '@/lib/axios';
import type { ApiResponse } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TemplateMedicine {
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  durationValue?: string;
  durationUnit: 'days' | 'weeks' | 'months';
  unit: string;
  route?: string;
  instructions?: string;
  quantity?: string;
}

export interface PrescriptionTemplateDoc {
  _id: string;
  name: string;
  scope: 'doctor' | 'clinic';
  createdBy: { _id: string; name: string } | string;
  medicines: TemplateMedicine[];
  advice?: string;
  dietAdvice?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplatePayload {
  name: string;
  scope: 'doctor' | 'clinic';
  medicines: TemplateMedicine[];
  advice?: string;
  dietAdvice?: string;
}

export type UpdateTemplatePayload = Partial<CreateTemplatePayload>;

// ── API ───────────────────────────────────────────────────────────────────────

export const templateApi = {
  list: (params?: { scope?: 'doctor' | 'clinic' | 'all'; q?: string }) =>
    api.get<ApiResponse<PrescriptionTemplateDoc[]>>('/prescription-templates', { params }),

  create: (data: CreateTemplatePayload) =>
    api.post<ApiResponse<PrescriptionTemplateDoc>>('/prescription-templates', data),

  update: (id: string, data: UpdateTemplatePayload) =>
    api.put<ApiResponse<PrescriptionTemplateDoc>>(`/prescription-templates/${id}`, data),

  delete: (id: string) =>
    api.delete(`/prescription-templates/${id}`),
};
