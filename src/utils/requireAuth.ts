import { Request } from "express";
import { AppError } from "./AppError";
import { AccessTokenPayload } from "./jwt";

export function requireAuth(req: Request): AccessTokenPayload {
  if (!req.auth) {
    throw new AppError(401, "Authentication required.");
  }
  return req.auth;
}
