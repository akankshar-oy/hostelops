import { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { requireAuth } from "../../utils/requireAuth";
import { requireParam } from "../../utils/requireParam";
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notification.service";
import { listNotificationsQuerySchema } from "./notification.validation";

export async function listNotificationsHandler(req: Request, res: Response): Promise<void> {
  const parsedQuery = listNotificationsQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    throw new AppError(400, "Validation failed.", parsedQuery.error.flatten());
  }

  const result = await listNotifications(requireAuth(req), parsedQuery.data);
  res.status(200).json(result);
}

export async function unreadCountHandler(req: Request, res: Response): Promise<void> {
  const count = await getUnreadCount(requireAuth(req));
  res.status(200).json({ count });
}

export async function markNotificationReadHandler(req: Request, res: Response): Promise<void> {
  const notification = await markNotificationRead(requireAuth(req), requireParam(req.params.id, "id"));
  res.status(200).json({ notification });
}

export async function markAllNotificationsReadHandler(req: Request, res: Response): Promise<void> {
  await markAllNotificationsRead(requireAuth(req));
  res.status(204).send();
}
