import { Request, Response } from "express";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { requireAuth } from "../../utils/requireAuth";
import { userRepository } from "../users/user.repository";
import { sanitizeUser } from "../users/user.service";
import {
  login,
  logout,
  refreshSession,
  registerStudent,
} from "./auth.service";

const REFRESH_COOKIE_NAME = "hostelops_refresh";
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const isProduction = env.nodeEnv === "production";

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/api/auth",
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
}

export async function registerHandler(req: Request, res: Response): Promise<void> {
  const { accessToken, refreshToken, user } = await registerStudent(req.body);
  setRefreshCookie(res, refreshToken);
  res.status(201).json({ accessToken, user });
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const { accessToken, refreshToken, user } = await login(req.body);
  setRefreshCookie(res, refreshToken);
  res.status(200).json({ accessToken, user });
}

export async function refreshHandler(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!token) {
    throw new AppError(401, "Missing refresh token.");
  }

  const { accessToken, refreshToken, user } = await refreshSession(token);
  setRefreshCookie(res, refreshToken);
  res.status(200).json({ accessToken, user });
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  if (req.auth) {
    await logout(req.auth.sub);
  }
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/api/auth" });
  res.status(204).send();
}

export async function meHandler(req: Request, res: Response): Promise<void> {
  const auth = requireAuth(req);
  const user = await userRepository.findById(auth.sub);
  if (!user) {
    throw new AppError(401, "User no longer exists.");
  }
  res.status(200).json({ user: sanitizeUser(user) });
}
