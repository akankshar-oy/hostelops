import { Job, Worker } from "bullmq";
import { bullConnection } from "../config/bullConnection";
import { Complaint, ComplaintStatus } from "../modules/complaints/complaint.model";
import { SLA_SWEEP_QUEUE } from "./slaSweep.queue";

interface SlaSweepResult {
  acknowledgeBreachesMarked: number;
  resolveBreachesMarked: number;
}

/**
 * Idempotent by construction: each update only touches documents that are
 * past deadline AND not already flagged, so re-running the same sweep (e.g.
 * after a retry) never double-applies anything — modifiedCount just drops to
 * zero once a complaint has been marked.
 */
async function processSlaSweep(_job: Job): Promise<SlaSweepResult> {
  const now = new Date();

  const acknowledgeResult = await Complaint.updateMany(
    { status: ComplaintStatus.OPEN, slaAcknowledgeDeadline: { $lt: now }, slaBreached: false },
    { $set: { slaBreached: true } }
  );

  const resolveResult = await Complaint.updateMany(
    {
      status: { $nin: [ComplaintStatus.OPEN, ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED] },
      slaResolveDeadline: { $lt: now },
      slaBreached: false,
    },
    { $set: { slaBreached: true } }
  );

  return {
    acknowledgeBreachesMarked: acknowledgeResult.modifiedCount,
    resolveBreachesMarked: resolveResult.modifiedCount,
  };
}

export const slaSweepWorker = new Worker(SLA_SWEEP_QUEUE, processSlaSweep, {
  connection: bullConnection,
  concurrency: 1,
});

slaSweepWorker.on("completed", (job, result: SlaSweepResult) => {
  if (result.acknowledgeBreachesMarked > 0 || result.resolveBreachesMarked > 0) {
    console.log(`[sla-sweep] job ${job.id} marked breaches:`, result);
  }
});

slaSweepWorker.on("failed", (job, err) => {
  console.error(`[sla-sweep] job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
});
