import { AppError } from "../../utils/AppError";
import { ComplaintCategory, ComplaintPriority } from "./complaint.model";
import { SLARule } from "./slaRule.model";

export interface SLADeadlines {
  acknowledgeDeadline: Date;
  resolveDeadline: Date;
}

export async function resolveSLADeadlines(
  category: ComplaintCategory,
  priority: ComplaintPriority,
  from: Date = new Date()
): Promise<SLADeadlines> {
  const rule =
    (await SLARule.findOne({ category, priority, isActive: true })) ??
    (await SLARule.findOne({ category: null, priority, isActive: true }));

  if (!rule) {
    throw new AppError(
      500,
      `No SLA rule configured for priority "${priority}". An admin must configure SLA rules before complaints can be created.`
    );
  }

  return {
    acknowledgeDeadline: new Date(from.getTime() + rule.ackHours * 60 * 60 * 1000),
    resolveDeadline: new Date(from.getTime() + rule.resolveHours * 60 * 60 * 1000),
  };
}
