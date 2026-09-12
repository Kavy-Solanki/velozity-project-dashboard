import { prisma } from "../prisma.js";
import { AppError } from "../errors/AppError.js";
import { AuthUser } from "../policies/project.policy.js";
import { RealtimePublisher } from "../realtime/realtimePublisher.js";

export class NotificationService {
  async listNotifications(user: AuthUser) {
    return prisma.notification.findMany({
      where: { recipientId: user.id },
      include: {
        task: {
          select: { id: true, title: true, projectId: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async getUnreadCount(user: AuthUser) {
    return prisma.notification.count({
      where: {
        recipientId: user.id,
        readAt: null,
      },
    });
  }

  async markAsRead(user: AuthUser, notificationId: string) {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw AppError.notFound("Notification not found");
    }

    if (notification.recipientId !== user.id) {
      throw AppError.forbidden("You do not own this notification");
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    const unreadCount = await this.getUnreadCount(user);
    RealtimePublisher.publishUnreadCount(user.id, unreadCount);

    return updated;
  }

  async markAllAsRead(user: AuthUser) {
    await prisma.notification.updateMany({
      where: {
        recipientId: user.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    RealtimePublisher.publishUnreadCount(user.id, 0);

    return { success: true };
  }
}

export const notificationService = new NotificationService();
