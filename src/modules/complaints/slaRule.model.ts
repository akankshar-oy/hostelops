import { HydratedDocument, Schema, model } from "mongoose";
import { ComplaintCategory, ComplaintPriority } from "./complaint.model";

export interface ISLARule {
  category: ComplaintCategory;
  priority: ComplaintPriority;
  ackHours: number;
  resolveHours: number;
}

export type SLARuleDocument = HydratedDocument<ISLARule>;

const slaRuleSchema = new Schema<ISLARule>({
  category: { type: String, enum: Object.values(ComplaintCategory), required: true },
  priority: { type: String, enum: Object.values(ComplaintPriority), required: true },
  ackHours: { type: Number, required: true },
  resolveHours: { type: Number, required: true },
});

export const SLARule = model<ISLARule>("SLARule", slaRuleSchema);
