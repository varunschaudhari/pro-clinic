import api from '@/lib/axios';
import type { ApiResponse, PaginatedResponse } from '@/types';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface AuditLogItem {
  _id:             string;
  clinicId:        string;
  action:          AuditAction;
  entity:          string;
  entityId:        string;
  entityLabel:     string;
  performedBy:     { _id: string; name: string; role: string } | null;
  performedByRole: string;
  ipAddress:       string;
  summary:         string;
  createdAt:       string;
}

export interface ListAuditParams {
  page?:      number;
  limit?:     number;
  entity?:    string;
  action?:    AuditAction;
  startDate?: string;
  endDate?:   string;
}

export const auditApi = {
  list: (params?: ListAuditParams) =>
    api.get<PaginatedResponse<AuditLogItem>>('/audit-logs', { params }),

  getEntityHistory: (entity: string, entityId: string) =>
    api.get<ApiResponse<AuditLogItem[]>>(`/audit-logs/${entity}/${entityId}`),
};
