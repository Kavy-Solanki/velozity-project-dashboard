import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";

const app = createApp();

let adminToken: string;
let pm1Token: string;
let pm2Token: string;
let dev1Token: string;
let dev2Token: string;

let pm1ProjectId: string;
let pm2ProjectId: string;
let dev1TaskId: string;
let dev2TaskId: string;

describe("Critical Security & Resource-Level Authorization", () => {
  beforeAll(async () => {
    // 1. Get tokens for each actor
    const adminRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@velozity.com", password: "Password123!" });
    adminToken = adminRes.body.data.accessToken;

    const pm1Res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "pm1@velozity.com", password: "Password123!" });
    pm1Token = pm1Res.body.data.accessToken;

    const pm2Res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "pm2@velozity.com", password: "Password123!" });
    pm2Token = pm2Res.body.data.accessToken;

    const dev1Res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "dev1@velozity.com", password: "Password123!" });
    dev1Token = dev1Res.body.data.accessToken;

    const dev2Res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "dev2@velozity.com", password: "Password123!" });
    dev2Token = dev2Res.body.data.accessToken;

    // 2. Query seeded resources to test ownership boundaries
    const pm1User = await prisma.user.findUnique({ where: { email: "pm1@velozity.com" } });
    const pm2User = await prisma.user.findUnique({ where: { email: "pm2@velozity.com" } });
    const dev1User = await prisma.user.findUnique({ where: { email: "dev1@velozity.com" } });
    const dev2User = await prisma.user.findUnique({ where: { email: "dev2@velozity.com" } });

    const pm1Project = await prisma.project.findFirst({ where: { createdById: pm1User!.id } });
    const pm2Project = await prisma.project.findFirst({ where: { createdById: pm2User!.id } });

    pm1ProjectId = pm1Project!.id;
    pm2ProjectId = pm2Project!.id;

    const dev1Task = await prisma.task.findFirst({
      where: {
        assignedDeveloperId: dev1User!.id,
        project: { createdById: pm1User!.id },
      },
    });
    const dev2Task = await prisma.task.findFirst({ where: { assignedDeveloperId: dev2User!.id } });

    dev1TaskId = dev1Task!.id;
    dev2TaskId = dev2Task!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Developer Boundaries", () => {
    it("Developer CANNOT enumerate users", async () => {
      const res = await request(app)
        .get("/api/v1/auth/users")
        .set("Authorization", `Bearer ${dev1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects assigning a task to a non-developer account", async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${dev1TaskId}`)
        .set("Authorization", `Bearer ${pm1Token}`)
        .send({ assignedDeveloperId: (await prisma.user.findUnique({
          where: { email: "pm2@velozity.com" },
          select: { id: true },
        }))!.id });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("BAD_REQUEST");
    });

    it("Developer CANNOT access another developer's task", async () => {
      // Dev1 attempts to GET task assigned to Dev2
      const res = await request(app)
        .get(`/api/v1/tasks/${dev2TaskId}`)
        .set("Authorization", `Bearer ${dev1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("Developer CANNOT update status on another developer's task", async () => {
      // Dev1 attempts to update Dev2's task status
      const res = await request(app)
        .patch(`/api/v1/tasks/${dev2TaskId}/status`)
        .set("Authorization", `Bearer ${dev1Token}`)
        .send({ status: "DONE" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("Developer CANNOT view PM project details directly", async () => {
      const res = await request(app)
        .get(`/api/v1/projects/${pm1ProjectId}`)
        .set("Authorization", `Bearer ${dev1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("Developer CANNOT create or manage projects", async () => {
      const res = await request(app)
        .post("/api/v1/projects")
        .set("Authorization", `Bearer ${dev1Token}`)
        .send({
          name: "Rogue Project",
          clientId: "some-id",
        });

      expect(res.status).toBe(403);
    });

    it("Developer task list returns ONLY tasks assigned to that developer", async () => {
      const res = await request(app)
        .get("/api/v1/tasks")
        .set("Authorization", `Bearer ${dev1Token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      // Every returned task MUST be assigned to dev1
      const dev1User = await prisma.user.findUnique({ where: { email: "dev1@velozity.com" } });
      for (const t of res.body.data) {
        expect(t.assignedDeveloperId).toBe(dev1User!.id);
      }
    });
  });

  describe("Project Manager Boundaries", () => {
    it("PM CANNOT view another PM's project", async () => {
      // PM1 attempts to GET project owned by PM2
      const res = await request(app)
        .get(`/api/v1/projects/${pm2ProjectId}`)
        .set("Authorization", `Bearer ${pm1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("PM CANNOT modify another PM's project", async () => {
      // PM1 attempts to PATCH project owned by PM2
      const res = await request(app)
        .patch(`/api/v1/projects/${pm2ProjectId}`)
        .set("Authorization", `Bearer ${pm1Token}`)
        .send({ name: "Hijacked Project Name" });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("PM CANNOT delete another PM's project", async () => {
      const res = await request(app)
        .delete(`/api/v1/projects/${pm2ProjectId}`)
        .set("Authorization", `Bearer ${pm1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("PM task list includes ONLY tasks within their owned projects", async () => {
      const res = await request(app)
        .get("/api/v1/tasks")
        .set("Authorization", `Bearer ${pm1Token}`);

      expect(res.status).toBe(200);
      const pm1User = await prisma.user.findUnique({ where: { email: "pm1@velozity.com" } });

      for (const t of res.body.data) {
        expect(t.project.createdBy.id).toBe(pm1User!.id);
      }
    });
  });

  describe("Admin Full Access", () => {
    it("Admin CAN view all projects regardless of creator", async () => {
      const res1 = await request(app)
        .get(`/api/v1/projects/${pm1ProjectId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res1.status).toBe(200);

      const res2 = await request(app)
        .get(`/api/v1/projects/${pm2ProjectId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res2.status).toBe(200);
    });

    it("Admin CAN view all tasks regardless of assignment", async () => {
      const res1 = await request(app)
        .get(`/api/v1/tasks/${dev1TaskId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res1.status).toBe(200);

      const res2 = await request(app)
        .get(`/api/v1/tasks/${dev2TaskId}`)
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res2.status).toBe(200);
    });
  });

  describe("Token Tampering & Invalid Requests", () => {
    it("rejects request with forged/tampered JWT", async () => {
      const tampered = dev1Token.slice(0, -6) + "xxxxxx";
      const res = await request(app)
        .get("/api/v1/tasks")
        .set("Authorization", `Bearer ${tampered}`);

      expect(res.status).toBe(401);
    });

    it("rejects invalid role claims or non-bearer formats", async () => {
      const res = await request(app)
        .get("/api/v1/tasks")
        .set("Authorization", "Basic 12345");

      expect(res.status).toBe(401);
    });
  });
});
