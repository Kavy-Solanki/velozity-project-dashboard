import crypto from "crypto";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { config } from "../config/index.js";
import { AppError } from "../errors/AppError.js";

export interface AccessTokenPayload {
  userId: string;
  role: Role;
  sessionId: string;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, {
    expiresIn: "15m",
  });
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, config.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, config.JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      throw AppError.unauthorized("Access token has expired");
    }
    throw AppError.unauthorized("Invalid access token");
  }
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, config.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      throw AppError.unauthorized("Refresh token has expired");
    }
    throw AppError.unauthorized("Invalid refresh token");
  }
}
