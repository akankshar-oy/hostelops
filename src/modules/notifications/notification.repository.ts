import { FilterQuery } from "mongoose";
import { INotification, Notification, NotificationDocument } from "./notification.model";

export const notificationRepository = {
  async findByUser(
    userId: string,
    page: number,
    limit: number,
    unreadOnly: boolean
  ): Promise<{ items: NotificationDocument[]; total: number }> {
    const filter: FilterQuery<INotification> = { userId };
    if (unreadOnly) {
      filter.read = false;
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
    ]);

    return { items, total };
  },

  countUnread(userId: string): Promise<number> {
    return Notification.countDocuments({ userId, read: false });
  },

  markRead(id: string, userId: string): Promise<NotificationDocument | null> {
    return Notification.findOneAndUpdate({ _id: id, userId }, { $set: { read: true } }, { new: true });
  },

  markAllRead(userId: string): Promise<void> {
    return Notification.updateMany({ userId, read: false }, { $set: { read: true } }).then(() => undefined);
  },
};
