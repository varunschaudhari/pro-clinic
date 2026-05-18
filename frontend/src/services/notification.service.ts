import api from '@/lib/axios';
import type { ApiResponse } from '@/types';

export type NotificationType =
  | 'low_stock'
  | 'out_of_stock'
  | 'pending_lab'
  | 'pending_bill'
  | 'missed_appointment';

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface NotificationItem {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  count: number;
  severity: NotificationSeverity;
  isRead: boolean;    // annotated server-side for the current user
  isResolved: boolean;
  updatedAt: string;
}

export const notificationApi = {
  list: () =>
    api.get<ApiResponse<NotificationItem[]>>('/notifications'),

  count: () =>
    api.get<ApiResponse<{ count: number }>>('/notifications/count'),

  markRead: (id: string) =>
    api.patch(`/notifications/${id}/read`),

  markAllRead: () =>
    api.patch('/notifications/mark-all-read'),
};
