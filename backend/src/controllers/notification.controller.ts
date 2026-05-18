import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { ApiResponse }         from '../utils/ApiResponse';
import { asyncHandler }        from '../utils/asyncHandler';

/** GET /notifications — refresh + return active alerts */
export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const notifications = await NotificationService.generateAndFetch(
    req.clinicId!.toString(),
    req.user!.userId.toString(),
    req.user!.role
  );

  // Annotate each with whether the current user has read it
  const uid = req.user!.userId.toString();
  const annotated = notifications.map((n) => ({
    ...n,
    isRead: n.readBy.some((id) => id.toString() === uid),
  }));

  return ApiResponse.success(res, annotated);
});

/** GET /notifications/count — lightweight unread count for polling */
export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const count = await NotificationService.getUnreadCount(
    req.clinicId!.toString(),
    req.user!.userId.toString(),
    req.user!.role
  );
  return ApiResponse.success(res, { count });
});

/** PATCH /notifications/:id/read */
export const markRead = asyncHandler(async (req: Request, res: Response) => {
  await NotificationService.markRead(
    req.clinicId!.toString(),
    req.params.id,
    req.user!.userId.toString()
  );
  return ApiResponse.success(res, null, 'Marked as read');
});

/** PATCH /notifications/mark-all-read */
export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await NotificationService.markAllRead(
    req.clinicId!.toString(),
    req.user!.userId.toString(),
    req.user!.role
  );
  return ApiResponse.success(res, null, 'All notifications marked as read');
});
