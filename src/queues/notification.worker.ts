import { Job, Worker } from "bullmq";
import { bullConnection } from "../config/bullConnection";
import { Notification } from "../modules/notifications/notification.model";
import { NOTIFICATION_QUEUE, NotificationJobData } from "./notification.queue";

/**
 * Idempotent via upsert on dedupeKey = job.id: a retry re-processes the same
 * BullMQ job (same id, attemptsMade incremented), so $setOnInsert makes a
 * retry after a successful-but-unacknowledged write a no-op instead of a
 * duplicate notification.
 */
async function processNotification(job: Job<NotificationJobData>): Promise<void> {
  await Notification.updateOne(
    { dedupeKey: job.id },
    {
      $setOnInsert: {
        userId: job.data.userId,
        complaintId: job.data.complaintId,
        type: job.data.type,
        message: job.data.message,
        read: false,
        dedupeKey: job.id,
      },
    },
    { upsert: true }
  );
}

export const notificationWorker = new Worker(NOTIFICATION_QUEUE, processNotification, {
  connection: bullConnection,
  concurrency: 5,
});

notificationWorker.on("failed", (job, err) => {
  console.error(`[notifications] job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
});
