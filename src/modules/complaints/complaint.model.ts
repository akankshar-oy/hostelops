import { HydratedDocument, Schema, Types, model } from "mongoose";

export enum ComplaintCategory {
  WATER = "WATER",
  ELECTRICITY = "ELECTRICITY",
  WIFI = "WIFI",
  EQUIPMENT = "EQUIPMENT",
  CLEANING = "CLEANING",
  MAINTENANCE = "MAINTENANCE",
  OTHER = "OTHER",
}

export enum ComplaintPriority {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

export enum ComplaintStatus {
  OPEN = "OPEN",
  ACKNOWLEDGED = "ACKNOWLEDGED",
  ASSIGNED = "ASSIGNED",
  IN_PROGRESS = "IN_PROGRESS",
  RESOLVED = "RESOLVED",
  REOPENED = "REOPENED",
  CLOSED = "CLOSED",
}

export interface IComplaint {
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  hostelId: Types.ObjectId;
  studentId: Types.ObjectId;
  assignedDepartmentId?: Types.ObjectId | null;
  assignedStaffId?: Types.ObjectId | null;
  status: ComplaintStatus;
  images: string[];
  slaAcknowledgeDeadline: Date;
  slaResolveDeadline: Date;
  slaBreached: boolean;
  escalationLevel: number;
  rating?: number | null;
  acknowledgedAt?: Date | null;
  assignedAt?: Date | null;
  resolvedAt?: Date | null;
  closedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ComplaintDocument = HydratedDocument<IComplaint>;

const complaintSchema = new Schema<IComplaint>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: Object.values(ComplaintCategory), required: true },
    priority: { type: String, enum: Object.values(ComplaintPriority), required: true },
    hostelId: { type: Schema.Types.ObjectId, ref: "Hostel", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedDepartmentId: { type: Schema.Types.ObjectId, ref: "Department" },
    assignedStaffId: { type: Schema.Types.ObjectId, ref: "User" },
    status: { type: String, enum: Object.values(ComplaintStatus), required: true, default: ComplaintStatus.OPEN },
    images: { type: [String], default: [] },
    slaAcknowledgeDeadline: { type: Date, required: true },
    slaResolveDeadline: { type: Date, required: true },
    slaBreached: { type: Boolean, default: false },
    escalationLevel: { type: Number, default: 0 },
    rating: { type: Number },
    acknowledgedAt: { type: Date },
    assignedAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
  },
  { timestamps: true }
);

complaintSchema.index({ hostelId: 1, status: 1 });
complaintSchema.index({ assignedDepartmentId: 1, status: 1 });
complaintSchema.index({ studentId: 1 });
complaintSchema.index({ status: 1, slaResolveDeadline: 1 });

export const Complaint = model<IComplaint>("Complaint", complaintSchema);
