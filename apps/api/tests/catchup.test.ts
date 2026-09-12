import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";
import { TaskStatus } from "@prisma/client";

const app = createApp();

let adminToken: string;
let pm1Token: string;
let dev1Token: string;

describe("Offline Reconnect & Database-Backed Missed Event Catchup", () => {
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("recovers missed events strictly from PostgreSQL and enforces a 20-event limit", async () => {
    // 1. Fetch catchup for Admin
    const res = await request(app)
      .get("/api/v1/activity/catchup")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    // Must be capped at 20 max
    expect(res.body.data.length).toBeLessThanOrEqual(20);
  });

  it("role-filters missed events so Developer ONLY receives assigned task events", async () => {
    const dev1User = await prisma.user.findUnique({ where: { email: "dev1@velozity.com" } });

    const res = await request(app)
      .get("/api/v1/activity/catchup")
      .set("Authorization", `Bearer ${dev1Token}`);

    expect(res.status).toBe(200);
    for (const event of res.body.data) {
      expect(event.task.assignedDeveloperId).toBe(dev1User!.id);
    }
  });

  it("role-filters missed events so PM ONLY receives events from their owned projects", async () => {
    const pm1User = await prisma.user.findUnique({ where: { email: "pm1@velozity.com" } });

    const res = await request(app)
      .get("/api/v1/activity/catchup")
      .set("Authorization", `Bearer ${pm1Token}`);

    expect(res.status).toBe(200);
    for (const event of res.body.data) {
      expect(event.task.project.createdById).toBe(pm1User!.id);
    }
  });

  it("uses createdAt and id as a deterministic cursor for same-timestamp events", async () => {
    const adminUser = await prisma.user.findUnique({ where: { email: "admin@velozity.com" } });
    const task = await prisma.task.findFirst();
    const createdAt = new Date("2099-01-01T00:00:00.000Z");

    expect(adminUser).toBeDefined();
    expect(task).toBeDefined();

    const createdEvents = await Promise.all(
      [TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW].map((toStatus) =>
        prisma.activityLog.create({
          data: {
            taskId: task!.id,
            actorId: adminUser!.id,
            fromStatus: TaskStatus.TODO,
            toStatus,
            createdAt,
          },
        }),
      ),
    );

    try {
      const firstPage = await request(app)
        .get(`/api/v1/activity/catchup?since=${new Date(createdAt.getTime() - 1).toISOString()}&limit=20`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(firstPage.status).toBe(200);
      const sameTimestampEvents = firstPage.body.data.filter(
        (event: { createdAt: string }) => event.createdAt === createdAt.toISOString(),
      );
      expect(sameTimestampEvents).toHaveLength(3);
      expect(sameTimestampEvents.map((event: { id: string }) => event.id)).toEqual(
        [...createdEvents].map((event) => event.id).sort(),
      );

      const firstEvent = sameTimestampEvents[0];
      const nextPage = await request(app)
        .get(
          `/api/v1/activity/catchup?since=${encodeURIComponent(firstEvent.createdAt)}&lastId=${firstEvent.id}&limit=20`,
        )
        .set("Authorization", `Bearer ${adminToken}`);

      expect(nextPage.status).toBe(200);
      const nextSameTimestampEvents = nextPage.body.data.filter(
        (event: { createdAt: string }) => event.createdAt === createdAt.toISOString(),
      );
      expect(nextSameTimestampEvents).toHaveLength(2);
      expect(nextSameTimestampEvents.map((event: { id: string }) => event.id)).toEqual(
        sameTimestampEvents.slice(1).map((event: { id: string }) => event.id),
      );
      expect(nextSameTimestampEvents.map((event: { id: string }) => event.id)).not.toContain(
        firstEvent.id,
      );
    } finally {
      await prisma.activityLog.deleteMany({
        where: { id: { in: createdEvents.map((event) => event.id) } },
      });
    }
  });

  it("rejects an incomplete activity cursor", async () => {
    const res = await request(app)
      .get("/api/v1/activity/catchup")
      .query({ lastId: "activity-without-timestamp" })
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
