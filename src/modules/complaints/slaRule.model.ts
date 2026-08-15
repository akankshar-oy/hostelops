import { HydratedDocument, Schema, model } from "mongoose";
import { ComplaintCategory, ComplaintPriority } from "./complaint.model";

export interface ISLARule {
  category?: ComplaintCategory | null;
  priority: ComplaintPriority;
  ackHours: number;
  resolveHours: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SLARuleDocument = HydratedDocument<ISLARule>;

const slaRuleSchema = new Schema<ISLARule>(
  {
    category: { type: String, enum: Object.values(ComplaintCategory), default: null },
    priority: { type: String, enum: Object.values(ComplaintPriority), required: true },
    ackHours: { type: Number, required: true, min: 0 },
    resolveHours: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

slaRuleSchema.index({ category: 1, priority: 1, isActive: 1 });

export const SLARule = model<ISLARule>("SLARule", slaRuleSchema);
