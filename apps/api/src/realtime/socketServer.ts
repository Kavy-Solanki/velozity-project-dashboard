import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { Role } from "@prisma/client";
import { config } from "../config/index.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { prisma } from "../prisma.js";
import { AuthUser } from "../policies/project.policy.js";
import { presenceTracker } from "./presence.js";
import { activityService } from "../services/activity.service.js";
import { catchupQuerySchema } from "../validation/activity.schema.js";

let io: Server | null = null;

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.io has not been initialized");
  }
  return io;
}

export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    transports: ["websocket"],
    cors: {
      origin: [config.CLIENT_ORIGIN, "http://localhost:5173", "http://127.0.0.1:5173"],
      credentials: true,
    },
  });

  // Authentication Middleware for incoming socket connections
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication error: No access token provided"));
      }

      const payload = verifyAccessToken(token);

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, name: true, role: true },
      });

      if (!user) {
        return next(new Error("Authentication error: User not found"));
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
        return next(new Error("Authentication error: Invalid or inactive session"));
      }

      socket.data.user = user;
      socket.data.sessionId = payload.sessionId;
      socket.data.tokenExpiresAt = payload.exp;
      next();
    } catch (err: any) {
      next(new Error(`Authentication error: ${err.message}`));
    }
  });

  io.on("connection", async (socket: Socket) => {
    const user = socket.data.user as AuthUser;
    const sessionId = socket.data.sessionId as string;
    const tokenExpiresAt = socket.data.tokenExpiresAt as number | undefined;
    const { onlineCount } = presenceTracker.add(user.id, socket.id);
    const sessionMonitor = setInterval(async () => {
      try {
        const session = await prisma.refreshSession.findFirst({
          where: {
            id: sessionId,
            userId: user.id,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          select: { id: true },
        });

        if (!session) {
          socket.disconnect(true);
        }
      } catch {
        socket.disconnect(true);
      }
    }, 30_000);
    const tokenExpiryTimer =
      tokenExpiresAt && tokenExpiresAt > Math.floor(Date.now() / 1000)
        ? setTimeout(() => socket.disconnect(true), tokenExpiresAt * 1000 - Date.now())
        : null;

    // 1. Join personal room for private notifications and assigned task events
    socket.join(`user:${user.id}`);

    // 2. Role-based rooms
    if (user.role === Role.ADMIN) {
      socket.join("admin:global");
      // Send initial presence count to admin
      socket.emit("presence:count", { count: onlineCount });
    } else if (user.role === Role.PROJECT_MANAGER) {
      // Find all projects created by this PM and join their rooms
      const projects = await prisma.project.findMany({
        where: { createdById: user.id },
        select: { id: true },
      });
      for (const p of projects) {
        socket.join(`project:${p.id}`);
      }
    }

    // Broadcast updated presence to all admins
    io!.to("admin:global").emit("presence:count", { count: presenceTracker.getOnlineCount() });

    // Handle database-backed offline catchup request
    socket.on("activity:catchup", async (data: unknown, callback) => {
      try {
        const parsed = catchupQuerySchema.parse(data ?? {});
        const events = await activityService.getCatchupEvents(
          user,
          parsed.since ? new Date(parsed.since) : undefined,
          parsed.lastId,
          parsed.limit,
        );

        if (typeof callback === "function") {
          callback({ success: true, data: events });
        } else {
          socket.emit("activity:catchup:response", { data: events });
        }
      } catch {
        if (typeof callback === "function") {
          callback({
            success: false,
            error: {
              code: "INVALID_CATCHUP_REQUEST",
              message: "Unable to process activity catchup request",
              details: [],
            },
          });
        }
      }
    });

    socket.on("disconnect", () => {
      clearInterval(sessionMonitor);
      if (tokenExpiryTimer) {
        clearTimeout(tokenExpiryTimer);
      }
      presenceTracker.remove(user.id, socket.id);
      io!.to("admin:global").emit("presence:count", { count: presenceTracker.getOnlineCount() });
    });
  });

  return io;
}
