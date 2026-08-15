import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { verifyAccessToken } from "../utils/jwt";

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new AppError(401, "Authentication required.");
  }

  const token = header.slice("Bearer ".length);
  try {
    req.auth = verifyAccessToken(token);
  } catch {
    throw new AppError(401, "Invalid or expired access token.");
  }

  next();
}
