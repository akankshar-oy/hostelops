import { Queue } from "bullmq";
import { bullConnection } from "../config/bullConnection";
import { NotificationType } from "../modules/notifications/notification.model";

export const NOTIFICATION_QUEUE = "notifications";
export const NOTIFICATION_JOB_NAME = "notify";

export interface NotificationJobData {
  userId: string;
  complaintId: string;
  type: NotificationType;
  message: string;
}

export const notificationQueue = new Queue<NotificationJobData>(NOTIFICATION_QUEUE, {
  connection: bullConnection,
});

/**
 * Fire-and-forget by design: a Redis hiccup enqueuing a notification must
 * never fail the complaint action that triggered it, so failures here are
 * logged, not thrown.
 */
export async function enqueueNotification(data: NotificationJobData): Promise<void> {
  try {
    await notificationQueue.add(NOTIFICATION_JOB_NAME, data, {
      attempts: 5,
      backoff: { type: "exponential", delay: 3_000 },
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 200 },
    });
  } catch (err) {
    console.error("Failed to enqueue notification:", err);
  }
}
