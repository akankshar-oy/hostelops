import { HydratedDocument, Schema, model } from "mongoose";
import { ComplaintCategory, ComplaintPriority } from "../complaints/complaint.model";

export enum EscalationTarget {
  DEPARTMENT_SUPERVISOR = "DEPARTMENT_SUPERVISOR",
  WARDEN = "WARDEN",
  ADMIN = "ADMIN",
}

export interface IEscalationLevel {
  level: number;
  afterMinutesPastDeadline: number;
  targetRole: EscalationTarget;
}

export interface IEscalationRule {
  name: string;
  category?: ComplaintCategory | null;
  priority?: ComplaintPriority | null;
  levels: IEscalationLevel[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type EscalationRuleDocument = HydratedDocument<IEscalationRule>;

const escalationLevelSchema = new Schema<IEscalationLevel>(
  {
    level: { type: Number, required: true },
    afterMinutesPastDeadline: { type: Number, required: true },
    targetRole: { type: String, enum: Object.values(EscalationTarget), required: true },
  },
  { _id: false }
);

const escalationRuleSchema = new Schema<IEscalationRule>(
  {
    name: { type: String, required: true },
    category: { type: String, enum: Object.values(ComplaintCategory), default: null },
    priority: { type: String, enum: Object.values(ComplaintPriority), default: null },
    levels: {
      type: [escalationLevelSchema],
      required: true,
      validate: {
        validator: (levels: IEscalationLevel[]) => levels.length > 0,
        message: "An escalation rule must define at least one level.",
      },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

escalationRuleSchema.index({ category: 1, priority: 1, isActive: 1 });

export const EscalationRule = model<IEscalationRule>("EscalationRule", escalationRuleSchema);
