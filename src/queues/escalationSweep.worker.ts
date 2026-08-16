import { Job, Worker } from "bullmq";
import { bullConnection } from "../config/bullConnection";
import { Complaint, ComplaintStatus } from "../modules/complaints/complaint.model";
import { applyEscalation, resolveEscalationLevel } from "../modules/complaints/escalation.service";
import { computeSlaSnapshot } from "../modules/complaints/sla.service";
import { ESCALATION_SWEEP_QUEUE } from "./escalationSweep.queue";

interface EscalationSweepResult {
  candidatesScanned: number;
  escalatedCount: number;
}

/**
 * Determines breach status live via computeSlaSnapshot rather than trusting
 * the persisted slaBreached flag, so this job doesn't depend on the SLA-sweep
 * job having already run in the same cycle. Idempotent: only escalates when
 * the resolved target level is strictly higher than the complaint's current
 * escalationLevel, so re-running with the same elapsed time is a no-op.
 */
async function processEscalationSweep(_job: Job): Promise<EscalationSweepResult> {
  const now = new Date();

  const candidates = await Complaint.find({
    status: { $nin: [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED] },
  });

  let escalatedCount = 0;

  for (const complaint of candidates) {
    const snapshot = computeSlaSnapshot(complaint, now);
    // Which clock is "active" flips once acknowledged and never flips back;
    // applyEscalation guards escalationLevel from decreasing across that
    // switch — see its docstring for why that's deliberate.
    const remainingMs = complaint.acknowledgedAt
      ? snapshot.resolveRemainingMs
      : snapshot.acknowledgeRemainingMs;

    if (remainingMs === null || remainingMs >= 0) {
      continue;
    }

    const minutesPastDeadline = Math.abs(remainingMs) / 60_000;
    const target = await resolveEscalationLevel(complaint.category, complaint.priority, minutesPastDeadline);

    if (target && target.level > complaint.escalationLevel) {
      await applyEscalation(complaint, target, undefined, "SYSTEM");
      escalatedCount += 1;
    }
  }

  return { candidatesScanned: candidates.length, escalatedCount };
}

export const escalationSweepWorker = new Worker(ESCALATION_SWEEP_QUEUE, processEscalationSweep, {
  connection: bullConnection,
  concurrency: 1,
});

escalationSweepWorker.on("completed", (job, result: EscalationSweepResult) => {
  if (result.escalatedCount > 0) {
    console.log(`[escalation-sweep] job ${job.id} escalated complaints:`, result);
  }
});

escalationSweepWorker.on("failed", (job, err) => {
  console.error(`[escalation-sweep] job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
});
