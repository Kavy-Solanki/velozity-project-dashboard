import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { config } from "../config/index.js";
import { authService } from "../services/auth.service.js";

const REFRESH_COOKIE_NAME = "refreshToken";

const getCookieOptions = () => ({
  httpOnly: true,
  secure: config.isProduction,
  sameSite: "none" as const,
  path: "/api/v1/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  domain: config.COOKIE_DOMAIN && config.COOKIE_DOMAIN !== "localhost" ? config.COOKIE_DOMAIN : undefined,
});

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accessToken, refreshToken, user } = await authService.login(req.body);

      res.cookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());

      res.status(200).json({
        data: {
          accessToken,
          user,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies[REFRESH_COOKIE_NAME];
      const { accessToken, newRefreshToken, user } = await authService.refresh(token);

      res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, getCookieOptions());

      res.status(200).json({
        data: {
          accessToken,
          user,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies[REFRESH_COOKIE_NAME];
      await authService.logout(token);

      res.clearCookie(REFRESH_COOKIE_NAME, {
        path: "/api/v1/auth",
        domain: config.COOKIE_DOMAIN && config.COOKIE_DOMAIN !== "localhost" ? config.COOKIE_DOMAIN : undefined,
      });

      res.status(200).json({
        data: { success: true },
      });
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({
        data: req.user,
      });
    } catch (err) {
      next(err);
    }
  }

  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = req.query.role as Role | undefined;
      const users = await authService.listUsers(role);
      res.status(200).json({
        data: users,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
