import { Request, Response, NextFunction } from "express";
import { activityService } from "../services/activity.service.js";

export class ActivityController {
  async getCatchup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const since = req.query.since ? new Date(req.query.since as string) : undefined;
      const lastId = req.query.lastId as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const events = await activityService.getCatchupEvents(
        req.user!,
        since,
        lastId,
        limit,
      );

      res.status(200).json({ data: events });
    } catch (err) {
      next(err);
    }
  }
}

export const activityController = new ActivityController();
