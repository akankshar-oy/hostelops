import { NextFunction, Request, Response } from "express";
import { UserRole } from "../modules/users/user.model";
import { AppError } from "../utils/AppError";

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      throw new AppError(401, "Authentication required.");
    }
    if (!roles.includes(req.auth.role)) {
      throw new AppError(403, "You do not have permission to perform this action.");
    }
    next();
  };
}
