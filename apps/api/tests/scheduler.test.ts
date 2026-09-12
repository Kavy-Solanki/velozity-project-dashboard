import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/prisma.js";
import { schedulerService } from "../src/services/scheduler.service.js";
import { TaskStatus, TaskPriority } from "@prisma/client";

describe("Automated Overdue Detection Background Scheduler", () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("independently detects and flags tasks past due date as overdue in PostgreSQL", async () => {
    const project = await prisma.project.findFirst();

    // Create a task due yesterday with isOverdue: false
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const testTask = await prisma.task.create({
      data: {
        projectId: project!.id,
        title: "Test Cron Scheduled Overdue Task",
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: yesterday,
        isOverdue: false,
      },
    });

    // Run scheduler job directly (simulating cron trigger)
    const count = await schedulerService.checkOverdueTasks();
    expect(count).toBeGreaterThanOrEqual(1);

    // Verify task is now marked overdue in DB
    const refreshed = await prisma.task.findUnique({
      where: { id: testTask.id },
    });
    expect(refreshed!.isOverdue).toBe(true);

    // Running again should be idempotent and not re-flag the same task
    const secondRunCount = await schedulerService.checkOverdueTasks();
    expect(secondRunCount).toBe(0);

    // Clean up test task
    await prisma.task.delete({ where: { id: testTask.id } });
  });
});
