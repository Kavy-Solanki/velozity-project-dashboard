import { getIO } from "./socketServer.js";
import { ActivityLog, Task, Project, User, Notification } from "@prisma/client";

export interface ActivityPayload extends ActivityLog {
  task: Task & {
    project: Project;
  };
  actor: Pick<User, "id" | "name" | "email" | "role">;
}

export class RealtimePublisher {
  static publishActivity(activity: ActivityPayload): void {
    try {
      const io = getIO();

      // 1. Global room for Admin
      io.to("admin:global").emit("activity:new", activity);

      // 2. Project room for PM who owns the project (and any Admin subscribed)
      io.to(`project:${activity.task.projectId}`).emit("activity:new", activity);

      // 3. User room for the assigned developer (if assigned and not already in project room)
      if (activity.task.assignedDeveloperId) {
        io.to(`user:${activity.task.assignedDeveloperId}`).emit("activity:new", activity);
      }
    } catch {
      // If socket server is not yet initialized (e.g. in standalone test script), fail silently
    }
  }

  static publishNotification(notification: Notification): void {
    try {
      const io = getIO();
      io.to(`user:${notification.recipientId}`).emit("notification:new", notification);
    } catch {
      // Fail silently if IO not initialized
    }
  }

  static publishUnreadCount(recipientId: string, count: number): void {
    try {
      const io = getIO();
      io.to(`user:${recipientId}`).emit("notification:count", { count });
    } catch {
      // Fail silently if IO not initialized
    }
  }
}
