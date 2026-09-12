import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { AppError } from "../errors/AppError.js";

export function authorizeRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }

    if (!roles.includes(req.user.role)) {
      return next(
        AppError.forbidden(`Role '${req.user.role}' is not authorized to access this resource`),
      );
    }

    next();
  };
}
