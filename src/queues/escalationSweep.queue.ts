import { Queue } from "bullmq";
import { bullConnection } from "../config/bullConnection";

export const ESCALATION_SWEEP_QUEUE = "escalation-sweep";
export const ESCALATION_SWEEP_JOB_NAME = "sweep";

export const escalationSweepQueue = new Queue(ESCALATION_SWEEP_QUEUE, { connection: bullConnection });

/**
 * Registers the repeatable escalation job. Safe to call on every worker boot,
 * same as scheduleSlaSweep.
 */
export async function scheduleEscalationSweep(): Promise<void> {
  await escalationSweepQueue.upsertJobScheduler(
    "escalation-sweep-scheduler",
    { every: 60_000 },
    {
      name: ESCALATION_SWEEP_JOB_NAME,
      opts: {
        attempts: 5,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 50 },
      },
    }
  );
}
