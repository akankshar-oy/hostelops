import { Queue } from "bullmq";
import { bullConnection } from "../config/bullConnection";

export const SLA_SWEEP_QUEUE = "sla-sweep";
export const SLA_SWEEP_JOB_NAME = "sweep";

export const slaSweepQueue = new Queue(SLA_SWEEP_QUEUE, { connection: bullConnection });

/**
 * Registers the repeatable sweep job via BullMQ's job scheduler. Safe to call
 * on every worker boot — upserting by the same scheduler id just replaces the
 * existing schedule rather than creating a duplicate.
 */
export async function scheduleSlaSweep(): Promise<void> {
  await slaSweepQueue.upsertJobScheduler(
    "sla-sweep-scheduler",
    { every: 60_000 },
    {
      name: SLA_SWEEP_JOB_NAME,
      opts: {
        attempts: 5,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 50 },
      },
    }
  );
}
