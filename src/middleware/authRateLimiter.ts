import rateLimit from "express-rate-limit";
import { RedisReply, RedisStore } from "rate-limit-redis";
import { redisClient } from "../config/redis";

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
  store: new RedisStore({
    prefix: "rl:auth:",
    sendCommand: (command: string, ...args: string[]): Promise<RedisReply> =>
      redisClient.call(command, ...args) as Promise<RedisReply>,
  }),
});
