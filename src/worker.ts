import { connectDB } from "./config/db";
import { scheduleSlaSweep } from "./queues/slaSweep.queue";
import { slaSweepWorker } from "./queues/slaSweep.worker";

async function main(): Promise<void> {
  await connectDB();
  await scheduleSlaSweep();
  console.log("Worker started. SLA sweep scheduled to run every 60s.");
}

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received, shutting down worker...`);
  await slaSweepWorker.close();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

main().catch((err) => {
  console.error("Failed to start worker:", err);
  process.exit(1);
});
