import { TaskStatus } from "@prisma/client";
import { prisma } from "../prisma.js";

export class SchedulerService {
  async checkOverdueTasks(): Promise<number> {
    const now = new Date();

    try {
      // Find tasks that are not done, due date is in the past, and not yet flagged as overdue
      const result = await prisma.task.updateMany({
        where: {
          status: {
            not: TaskStatus.DONE,
          },
          dueDate: {
            lt: now,
          },
          isOverdue: false,
        },
        data: {
          isOverdue: true,
        },
      });

      if (result.count > 0) {
        console.log(`[Scheduler] Flagged ${result.count} tasks as overdue.`);
      }

      return result.count;
    } catch (error) {
      console.error("[Scheduler] Error checking overdue tasks:", error);
      return 0;
    }
  }
}

export const schedulerService = new SchedulerService();
