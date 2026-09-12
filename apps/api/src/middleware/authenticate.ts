import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/tokens.js";
import { prisma } from "../prisma.js";
import { AppError } from "../errors/AppError.js";
import { AuthUser } from "../policies/project.policy.js";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionId?: string;
    }
  }
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw AppError.unauthorized("Missing or malformed Authorization header");
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw AppError.unauthorized("Access token is required");
    }

    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      throw AppError.unauthorized("User account no longer exists");
    }

    const session = await prisma.refreshSession.findFirst({
      where: {
        id: payload.sessionId,
        userId: payload.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!session) {
      throw AppError.unauthorized("Access session is no longer active");
    }

    req.user = user;
    req.sessionId = payload.sessionId;
    next();
  } catch (err) {
    next(err);
  }
}
