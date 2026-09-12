import { Request, Response, NextFunction } from "express";
import { notificationService } from "../services/notification.service.js";

export class NotificationController {
  async listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const notifications = await notificationService.listNotifications(req.user!);
      res.status(200).json({ data: notifications });
    } catch (err) {
      next(err);
    }
  }

  async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const count = await notificationService.getUnreadCount(req.user!);
      res.status(200).json({ data: { count } });
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const notification = await notificationService.markAsRead(req.user!, id);
      res.status(200).json({ data: notification });
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await notificationService.markAllAsRead(req.user!);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const notificationController = new NotificationController();
