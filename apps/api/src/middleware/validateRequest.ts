import { Request, Response, NextFunction } from "express";
import { ZodError, ZodType } from "zod";
import { AppError } from "../errors/AppError.js";

export function validateRequest(
  schema: ZodType,
  source: "body" | "query" | "params" = "body",
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync(req[source]);
      req[source] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return next(AppError.badRequest("Invalid request data", details));
      }
      next(error);
    }
  };
}
