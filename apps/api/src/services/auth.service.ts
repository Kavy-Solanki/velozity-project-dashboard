import bcrypt from "bcrypt";
import { Role } from "@prisma/client";
import { prisma } from "../prisma.js";
import { AppError } from "../errors/AppError.js";
import {
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/tokens.js";
import { LoginInput } from "../validation/auth.schema.js";

export class AuthService {
  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw AppError.unauthorized("Invalid email or password");
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw AppError.unauthorized("Invalid email or password");
    }

    // Create a new RefreshSession in PostgreSQL
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Temporary placeholder hash until signed token is created
    const tempHash = hashToken(`${user.id}-${Date.now()}-${Math.random()}`);

    const session = await prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash: tempHash,
        expiresAt,
      },
    });

    const accessToken = signAccessToken({
      userId: user.id,
      role: user.role,
      sessionId: session.id,
    });

    const refreshToken = signRefreshToken({
      userId: user.id,
      sessionId: session.id,
    });

    // Update session with actual hash of the refresh token
    const actualHash = hashToken(refreshToken);
    await prisma.refreshSession.update({
      where: { id: session.id },
      data: { tokenHash: actualHash },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refresh(oldRefreshToken: string) {
    if (!oldRefreshToken) {
      throw AppError.unauthorized("Refresh token is required");
    }

    const payload = verifyRefreshToken(oldRefreshToken);
    const tokenHash = hashToken(oldRefreshToken);

    return prisma.$transaction(async (tx) => {
      const session = await tx.refreshSession.findFirst({
        where: {
          id: payload.sessionId,
          userId: payload.userId,
          tokenHash,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: { user: true },
      });

      if (!session) {
        throw AppError.unauthorized("Refresh session has expired or been revoked");
      }

      // Conditional revocation makes concurrent refresh requests single-use.
      const revoked = await tx.refreshSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      if (revoked.count !== 1) {
        throw AppError.unauthorized("Refresh session has expired or been revoked");
      }

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const tempHash = hashToken(`${session.userId}-${Date.now()}-${Math.random()}`);

      const newSession = await tx.refreshSession.create({
        data: {
          userId: session.userId,
          tokenHash: tempHash,
          expiresAt,
        },
      });

      const accessToken = signAccessToken({
        userId: session.user.id,
        role: session.user.role,
        sessionId: newSession.id,
      });

      const newRefreshToken = signRefreshToken({
        userId: session.user.id,
        sessionId: newSession.id,
      });

      const actualHash = hashToken(newRefreshToken);
      await tx.refreshSession.update({
        where: { id: newSession.id },
        data: { tokenHash: actualHash },
      });

      return {
        accessToken,
        newRefreshToken,
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          role: session.user.role,
        },
      };
    });
  }

  async logout(refreshToken?: string) {
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await prisma.refreshSession
        .updateMany({
          where: { tokenHash, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        .catch(() => {});
    }
  }

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!user) {
      throw AppError.notFound("User not found");
    }
    return user;
  }

  async listUsers(role?: Role) {
    return prisma.user.findMany({
      where: role ? { role } : undefined,
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    });
  }
}

export const authService = new AuthService();
