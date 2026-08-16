import { Types } from "mongoose";
import { AppError } from "../../utils/AppError";
import { AccessTokenPayload } from "../../utils/jwt";
import { notificationRepository } from "./notification.repository";
import { NotificationDocument } from "./notification.model";
import { ListNotificationsQuery } from "./notification.validation";

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function listNotifications(
  auth: AccessTokenPayload,
  query: ListNotificationsQuery
): Promise<{ notifications: NotificationDocument[]; pagination: Pagination }> {
  const { items, total } = await notificationRepository.findByUser(
    auth.sub,
    query.page,
    query.limit,
    query.unreadOnly ?? false
  );

  return {
    notifications: items,
    pagination: {
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

export function getUnreadCount(auth: AccessTokenPayload): Promise<number> {
  return notificationRepository.countUnread(auth.sub);
}

export async function markNotificationRead(
  auth: AccessTokenPayload,
  id: string
): Promise<NotificationDocument> {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(400, "Invalid notification id.");
  }

  const notification = await notificationRepository.markRead(id, auth.sub);
  if (!notification) {
    throw new AppError(404, "Notification not found.");
  }

  return notification;
}

export async function markAllNotificationsRead(auth: AccessTokenPayload): Promise<void> {
  await notificationRepository.markAllRead(auth.sub);
}
