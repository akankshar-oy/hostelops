import { Types } from "mongoose";
import { EscalationRule, EscalationTarget } from "../escalation/escalationRule.model";
import { ComplaintCategory, ComplaintDocument, ComplaintPriority } from "./complaint.model";
import { notifyComplaintEscalated } from "./complaintNotifier";
import { ComplaintStatusHistory } from "./complaintStatusHistory.model";

export interface ResolvedEscalationLevel {
  level: number;
  targetRole: EscalationTarget;
}

/**
 * Finds the highest escalation level whose threshold has been crossed, given
 * how long the complaint has been past its relevant SLA deadline. Same
 * category-then-priority-wildcard fallback as SLA rule lookup.
 */
export async function resolveEscalationLevel(
  category: ComplaintCategory,
  priority: ComplaintPriority,
  minutesPastDeadline: number
): Promise<ResolvedEscalationLevel | null> {
  const rule =
    (await EscalationRule.findOne({ category, priority, isActive: true })) ??
    (await EscalationRule.findOne({ category: null, priority, isActive: true }));

  if (!rule) {
    return null;
  }

  const eligible = rule.levels
    .filter((level) => level.afterMinutesPastDeadline <= minutesPastDeadline)
    .sort((a, b) => b.level - a.level);

  return eligible[0] ? { level: eligible[0].level, targetRole: eligible[0].targetRole } : null;
}

/**
 * Finds the next configured level above the complaint's current one,
 * regardless of elapsed time — used for a warden/admin manually escalating
 * on demand rather than waiting for the automatic sweep.
 */
export async function resolveNextEscalationLevel(
  category: ComplaintCategory,
  priority: ComplaintPriority,
  currentLevel: number
): Promise<ResolvedEscalationLevel | null> {
  const rule =
    (await EscalationRule.findOne({ category, priority, isActive: true })) ??
    (await EscalationRule.findOne({ category: null, priority, isActive: true }));

  if (!rule) {
    return null;
  }

  const next = rule.levels
    .filter((level) => level.level > currentLevel)
    .sort((a, b) => a.level - b.level)[0];

  return next ? { level: next.level, targetRole: next.targetRole } : null;
}

/**
 * Bumps escalationLevel and records the event in the complaint's status
 * history without changing its lifecycle status (same "same-status audit
 * entry" pattern used for reassignment). actorId is omitted for
 * system-triggered escalations (the automatic sweep has no human actor).
 *
 * escalationLevel is a single field but is driven by two different clocks
 * over a complaint's life: the acknowledge-deadline clock while it's still
 * OPEN, then permanently the resolve-deadline clock once acknowledgedAt is
 * set (that switch never reverses, including through REOPENED). It is
 * deliberately monotonic — the "worst level ever reached," not "how bad
 * things look on whichever clock is active right now." A complaint that
 * breached hard on the ack clock and got escalated to WARDEN must not have
 * that quietly walked back down just because the resolve clock hasn't (yet,
 * or ever) breached as severely — the warden has already been alerted, and
 * silently un-escalating would be confusing and could cause a missed
 * follow-up. The guard below enforces that regardless of which caller
 * invokes this, rather than relying on every call site to remember to check.
 */
export async function applyEscalation(
  complaint: ComplaintDocument,
  target: ResolvedEscalationLevel,
  actorId: string | undefined,
  actorRole: string,
  note?: string
): Promise<void> {
  if (target.level <= complaint.escalationLevel) {
    return;
  }

  complaint.escalationLevel = target.level;
  await complaint.save();

  await ComplaintStatusHistory.create({
    complaintId: complaint._id,
    fromStatus: complaint.status,
    toStatus: complaint.status,
    actorId: actorId ? new Types.ObjectId(actorId) : undefined,
    actorRole,
    note: note ?? `Escalated to level ${target.level} (target: ${target.targetRole}).`,
  });

  await notifyComplaintEscalated(complaint, target.targetRole);
}
