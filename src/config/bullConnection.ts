import IORedis from "ioredis";
import { env } from "./env";

export const bullConnection = new IORedis(env.redisUrl, {
  maxRetriesPerRequest: null,
});
