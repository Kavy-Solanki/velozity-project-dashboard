import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { TaskStatus } from "@prisma/client";

const app = createApp();

let adminToken: string;
let pm1Token: string;
let dev1Token: string;
let dev1TaskId: string;
let pm1User: any;

describe("Task APIs, Query Parameter Filtering, and Status Lifecycle", () => {
  beforeAll(async () => {
    const adminRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@velozity.com", password: "Password123!" });
    adminToken = adminRes.body.data.accessToken;

    const pm1Res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "pm1@velozity.com", password: "Password123!" });
    pm1Token = pm1Res.body.data.accessToken;

    const dev1Res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "dev1@velozity.com", password: "Password123!" });
    dev1Token = dev1Res.body.data.accessToken;

    pm1User = await prisma.user.findUnique({ where: { email: "pm1@velozity.com" } });
    const dev1User = await prisma.user.findUnique({ where: { email: "dev1@velozity.com" } });

    // Pick a task assigned to dev1 under pm1's project that is NOT in IN_REVIEW
    const task = await prisma.task.findFirst({
      where: {
        assignedDeveloperId: dev1User!.id,
        project: { createdById: pm1User!.id },
        status: { not: TaskStatus.IN_REVIEW },
      },
    });
    dev1TaskId = task!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Server-Side Query Parameter Filtering", () => {
    it("filters tasks by status parameter", async () => {
      const res = await request(app)
        .get("/api/v1/tasks?status=IN_PROGRESS")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const t of res.body.data) {
        expect(t.status).toBe(TaskStatus.IN_PROGRESS);
      }
    });

    it("filters tasks by priority parameter", async () => {
      const res = await request(app)
        .get("/api/v1/tasks?priority=CRITICAL")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const t of res.body.data) {
        expect(t.priority).toBe("CRITICAL");
      }
    });

    it("filters tasks by due date range (dueFrom & dueTo)", async () => {
      const dueFrom = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const dueTo = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .get(`/api/v1/tasks?dueFrom=${dueFrom}&dueTo=${dueTo}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const t of res.body.data) {
        const taskDueDate = new Date(t.dueDate).getTime();
        expect(taskDueDate).toBeGreaterThanOrEqual(new Date(dueFrom).getTime());
        expect(taskDueDate).toBeLessThanOrEqual(new Date(dueTo).getTime());
      }
    });
  });

  describe("Status Transition Transaction & Activity Log Persistence", () => {
    it("creates ActivityLog and Notification when Dev moves task to IN_REVIEW", async () => {
      const activityCountBefore = await prisma.activityLog.count({
        where: { taskId: dev1TaskId },
      });

      // Dev1 changes assigned task status to IN_REVIEW
      const res = await request(app)
        .patch(`/api/v1/tasks/${dev1TaskId}/status`)
        .set("Authorization", `Bearer ${dev1Token}`)
        .send({ status: "IN_REVIEW" });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("IN_REVIEW");

      // Verify ActivityLog was created in PostgreSQL
      const activity = await prisma.activityLog.findFirst({
        where: { taskId: dev1TaskId, toStatus: "IN_REVIEW" },
        orderBy: { createdAt: "desc" },
      });
      expect(activity).toBeDefined();
      expect(activity!.toStatus).toBe("IN_REVIEW");
      expect(
        await prisma.activityLog.count({ where: { taskId: dev1TaskId } }),
      ).toBe(activityCountBefore + 1);

      // Verify Scenario 2: PM receives notification in PostgreSQL
      const notif = await prisma.notification.findFirst({
        where: {
          recipientId: pm1User.id,
          taskId: dev1TaskId,
        },
        orderBy: { createdAt: "desc" },
      });
      expect(notif).toBeDefined();
      expect(notif!.message).toContain("moved to In Review");
    });

    it("rejects status changes through the general task update route", async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${dev1TaskId}`)
        .set("Authorization", `Bearer ${pm1Token}`)
        .send({ status: "DONE" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });
});
