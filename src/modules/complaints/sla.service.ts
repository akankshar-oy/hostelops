import { AppError } from "../../utils/AppError";
import { ComplaintCategory, ComplaintDocument, ComplaintPriority, ComplaintStatus } from "./complaint.model";
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

const AT_RISK_RATIO = 0.2;

export type OverallSlaStatus = "ON_TRACK" | "AT_RISK" | "BREACHED" | "MET";

export interface SlaSnapshot {
  acknowledgeBreached: boolean;
  resolveBreached: boolean;
  acknowledgeRemainingMs: number | null;
  resolveRemainingMs: number | null;
  overallStatus: OverallSlaStatus;
}

/**
 * Pure, read-time SLA computation — no DB writes. Once acknowledged, the ack
 * deadline stops being "remaining" (it's a historical fact); once resolved/
 * closed, the resolve deadline is measured against resolvedAt, not "now",
 * since the clock has effectively stopped. "At risk" is relative to each
 * complaint's own SLA window (last 20% of it remaining) rather than a fixed
 * time, so a HIGH-priority complaint's 15-minute ack window doesn't read as
 * permanently at-risk the moment it's created.
 */
export function computeSlaSnapshot(complaint: ComplaintDocument, now: Date = new Date()): SlaSnapshot {
  const isAcknowledged = complaint.acknowledgedAt != null;
  const isFinal = complaint.status === ComplaintStatus.RESOLVED || complaint.status === ComplaintStatus.CLOSED;

  const acknowledgeReferenceTime = complaint.acknowledgedAt ?? now;
  const acknowledgeBreached =
    acknowledgeReferenceTime.getTime() > complaint.slaAcknowledgeDeadline.getTime();
  const acknowledgeRemainingMs = isAcknowledged
    ? null
    : complaint.slaAcknowledgeDeadline.getTime() - now.getTime();
  const acknowledgeWindowMs = complaint.slaAcknowledgeDeadline.getTime() - complaint.createdAt.getTime();

  const resolveReferenceTime = isFinal ? (complaint.resolvedAt ?? now) : now;
  const resolveBreached = resolveReferenceTime.getTime() > complaint.slaResolveDeadline.getTime();
  const resolveRemainingMs = isFinal ? null : complaint.slaResolveDeadline.getTime() - now.getTime();
  const resolveWindowMs = complaint.slaResolveDeadline.getTime() - complaint.createdAt.getTime();

  let overallStatus: OverallSlaStatus;
  if (isFinal) {
    overallStatus = acknowledgeBreached || resolveBreached ? "BREACHED" : "MET";
  } else if (acknowledgeBreached || resolveBreached) {
    overallStatus = "BREACHED";
  } else {
    const relevantRemainingMs = isAcknowledged ? resolveRemainingMs : acknowledgeRemainingMs;
    const relevantWindowMs = isAcknowledged ? resolveWindowMs : acknowledgeWindowMs;
    overallStatus =
      relevantRemainingMs !== null && relevantWindowMs > 0 && relevantRemainingMs <= relevantWindowMs * AT_RISK_RATIO
        ? "AT_RISK"
        : "ON_TRACK";
  }

  return { acknowledgeBreached, resolveBreached, acknowledgeRemainingMs, resolveRemainingMs, overallStatus };
}
