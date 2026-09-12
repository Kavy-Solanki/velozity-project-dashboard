import cron, { ScheduledTask } from "node-cron";
import { schedulerService } from "../services/scheduler.service.js";

let cronTask: ScheduledTask | null = null;

export function initOverdueCron(): ScheduledTask {
  // Run every minute: * * * * *
  cronTask = cron.schedule("* * * * *", async () => {
    await schedulerService.checkOverdueTasks();
  });

  console.log("[Scheduler] Automated overdue task detector started (runs every minute).");
  return cronTask;
}

export function stopOverdueCron(): void {
  if (cronTask) {
    cronTask.stop();
    cronTask = null;
  }
}
