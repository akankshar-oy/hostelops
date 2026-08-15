import { HydratedDocument, Schema, Types, model } from "mongoose";
import { ComplaintCategory } from "../complaints/complaint.model";

export enum IncidentStatus {
  OPEN = "OPEN",
  RESOLVED = "RESOLVED",
}

export interface IIncident {
  title: string;
  category: ComplaintCategory;
  hostelId: Types.ObjectId;
  block?: string | null;
  status: IncidentStatus;
  complaintIds: Types.ObjectId[];
  firstReportedAt: Date;
  lastReportedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type IncidentDocument = HydratedDocument<IIncident>;

const incidentSchema = new Schema<IIncident>(
  {
    title: { type: String, required: true },
    category: { type: String, enum: Object.values(ComplaintCategory), required: true },
    hostelId: { type: Schema.Types.ObjectId, ref: "Hostel", required: true },
    block: { type: String, default: null },
    status: { type: String, enum: Object.values(IncidentStatus), default: IncidentStatus.OPEN },
    complaintIds: { type: [Schema.Types.ObjectId], ref: "Complaint", default: [] },
    firstReportedAt: { type: Date, required: true },
    lastReportedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

incidentSchema.index({ hostelId: 1, category: 1, status: 1 });
incidentSchema.index({ status: 1, lastReportedAt: -1 });

export const Incident = model<IIncident>("Incident", incidentSchema);
