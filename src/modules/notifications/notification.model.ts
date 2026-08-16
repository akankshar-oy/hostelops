import { HydratedDocument, Schema, Types, model } from "mongoose";

export enum NotificationType {
  COMPLAINT_SUBMITTED = "COMPLAINT_SUBMITTED",
  COMPLAINT_ACKNOWLEDGED = "COMPLAINT_ACKNOWLEDGED",
  COMPLAINT_ASSIGNED = "COMPLAINT_ASSIGNED",
  COMPLAINT_STATUS_CHANGED = "COMPLAINT_STATUS_CHANGED",
  COMPLAINT_ESCALATED = "COMPLAINT_ESCALATED",
  COMPLAINT_RESOLVED = "COMPLAINT_RESOLVED",
  COMPLAINT_REOPENED = "COMPLAINT_REOPENED",
}

export interface INotification {
  userId: Types.ObjectId;
  complaintId: Types.ObjectId;
  type: NotificationType;
  message: string;
  read: boolean;
  /** The BullMQ job id that created this notification — makes job retries idempotent via upsert. */
  dedupeKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = HydratedDocument<INotification>;

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    complaintId: { type: Schema.Types.ObjectId, ref: "Complaint", required: true },
    type: { type: String, enum: Object.values(NotificationType), required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    dedupeKey: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification = model<INotification>("Notification", notificationSchema);
