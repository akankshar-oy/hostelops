import { HydratedDocument, Schema, Types, model } from "mongoose";

export interface INotification {
  userId: Types.ObjectId;
  complaintId: Types.ObjectId;
  message: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = HydratedDocument<INotification>;

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    complaintId: { type: Schema.Types.ObjectId, ref: "Complaint", required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1 });

export const Notification = model<INotification>("Notification", notificationSchema);
