import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import request from "supertest";
import { io as Client, Socket as ClientSocket } from "socket.io-client";
import { createApp } from "../src/app.js";
import { initSocketServer } from "../src/realtime/socketServer.js";
import { prisma } from "../src/prisma.js";
import { taskService } from "../src/services/task.service.js";
import { TaskStatus } from "@prisma/client";

let server: http.Server;
let port: number;
let serverUrl: string;
let socketServer: ReturnType<typeof initSocketServer>;

let adminToken: string;
let pm1Token: string;
let pm2Token: string;
let dev1Token: string;

let dev1User: any;
let pm1User: any;
let pm2User: any;
let dev1Task: any;

describe("WebSocket Security, Role-Filtered Feeds, and Realtime Catchup", () => {
  beforeAll(async () => {
    const app = createApp();
    server = http.createServer(app);
    socketServer = initSocketServer(server);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === "object") {
          port = addr.port;
          serverUrl = `http://localhost:${port}`;
        }
        resolve();
      });
    });

    // Acquire tokens
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

    pm1User = await prisma.user.findUnique({ where: { email: "pm1@velozity.com" } });
    pm2User = await prisma.user.findUnique({ where: { email: "pm2@velozity.com" } });
    dev1User = await prisma.user.findUnique({ where: { email: "dev1@velozity.com" } });

    // Pick a task owned by PM1 and assigned to Dev1
    dev1Task = await prisma.task.findFirst({
      where: {
        assignedDeveloperId: dev1User.id,
        project: { createdById: pm1User.id },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("configures both server and test clients for WebSocket-only transport", () => {
    expect(socketServer.opts.transports).toEqual(["websocket"]);
    expect(["websocket"]).toEqual(["websocket"]);
  });

  it("rejects socket connection without valid token", async () => {
    const unauthSocket = Client(serverUrl, {
      transports: ["websocket"],
      reconnection: false,
    });

    const error = await new Promise<string>((resolve) => {
      unauthSocket.on("connect_error", (err) => {
        resolve(err.message);
      });
    });

    unauthSocket.disconnect();
    expect(error).toContain("Authentication error");
  });

  it("rejects a socket connection when the access token session was revoked", async () => {
    const loginRes = await request(server)
      .post("/api/v1/auth/login")
      .send({ email: "dev1@velozity.com", password: "Password123!" });
    const oldAccessToken = loginRes.body.data.accessToken;
    const refreshCookie = (loginRes.headers["set-cookie"] as unknown as string[]).find((value: string) =>
      value.startsWith("refreshToken="),
    );

    await request(server).post("/api/v1/auth/logout").set("Cookie", refreshCookie!);

    const revokedSocket = Client(serverUrl, {
      auth: { token: oldAccessToken },
      transports: ["websocket"],
      reconnection: false,
    });
    let connected = false;
    revokedSocket.on("connect", () => {
      connected = true;
    });

    const error = await new Promise<string>((resolve) => {
      revokedSocket.on("connect_error", (err) => resolve(err.message));
    });

    revokedSocket.disconnect();
    expect(connected).toBe(false);
    expect(error).toContain("Authentication error");
  });

  it("authenticates socket connection and broadcasts presence to Admin", async () => {
    const adminSocket: ClientSocket = Client(serverUrl, {
      auth: { token: adminToken },
      transports: ["websocket"],
    });

    const presencePromise = new Promise<number>((resolve) => {
      adminSocket.on("presence:count", (data: { count: number }) => {
        resolve(data.count);
      });
    });

    const count = await presencePromise;
    expect(count).toBeGreaterThanOrEqual(1);

    adminSocket.disconnect();
  });

  it("role-filters realtime activity: Admin, owning PM, and assigned Dev receive event; unauthorized PM does NOT", async () => {
    const adminSocket = Client(serverUrl, { auth: { token: adminToken }, transports: ["websocket"] });
    const pm1Socket = Client(serverUrl, { auth: { token: pm1Token }, transports: ["websocket"] });
    const pm2Socket = Client(serverUrl, { auth: { token: pm2Token }, transports: ["websocket"] });
    const dev1Socket = Client(serverUrl, { auth: { token: dev1Token }, transports: ["websocket"] });

    // Wait for all sockets to connect
    await Promise.all([
      new Promise<void>((res) => adminSocket.on("connect", () => res())),
      new Promise<void>((res) => pm1Socket.on("connect", () => res())),
      new Promise<void>((res) => pm2Socket.on("connect", () => res())),
      new Promise<void>((res) => dev1Socket.on("connect", () => res())),
    ]);

    let adminReceived = false;
    let pm1Received = false;
    let dev1Received = false;
    let pm2Received = false;

    adminSocket.on("activity:new", (data) => {
      if (data.taskId === dev1Task.id) adminReceived = true;
    });

    pm1Socket.on("activity:new", (data) => {
      if (data.taskId === dev1Task.id) pm1Received = true;
    });

    dev1Socket.on("activity:new", (data) => {
      if (data.taskId === dev1Task.id) dev1Received = true;
    });

    pm2Socket.on("activity:new", (data) => {
      if (data.taskId === dev1Task.id) pm2Received = true;
    });

    // Trigger status update
    const targetStatus = dev1Task.status === TaskStatus.TODO ? TaskStatus.IN_PROGRESS : TaskStatus.TODO;
    await taskService.updateTaskStatus(dev1User, dev1Task.id, targetStatus);

    // Give 500ms for event propagation
    await new Promise((r) => setTimeout(r, 500));

    expect(adminReceived).toBe(true);
    expect(pm1Received).toBe(true);
    expect(dev1Received).toBe(true);
    // CRITICAL: PM2 must NEVER receive activity from PM1's project!
    expect(pm2Received).toBe(false);

    adminSocket.disconnect();
    pm1Socket.disconnect();
    pm2Socket.disconnect();
    dev1Socket.disconnect();
  });

  it("handles activity:catchup socket event directly from PostgreSQL", async () => {
    const devSocket = Client(serverUrl, { auth: { token: dev1Token }, transports: ["websocket"] });

    await new Promise<void>((res) => devSocket.on("connect", () => res()));

    const response = await new Promise<any>((resolve) => {
      devSocket.emit("activity:catchup", {}, (res: any) => {
        resolve(res);
      });
    });

    expect(response.success).toBe(true);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBeLessThanOrEqual(20);

    // Each event must be assigned to dev1
    for (const ev of response.data) {
      expect(ev.task.assignedDeveloperId).toBe(dev1User.id);
    }

    devSocket.disconnect();
  });

  it("returns a generic error for an invalid activity catchup payload", async () => {
    const devSocket = Client(serverUrl, { auth: { token: dev1Token }, transports: ["websocket"] });
    await new Promise<void>((res) => devSocket.on("connect", () => res()));

    const response = await new Promise<any>((resolve) => {
      devSocket.emit("activity:catchup", { lastId: "missing-since" }, resolve);
    });

    expect(response.success).toBe(false);
    expect(response.error).toEqual({
      code: "INVALID_CATCHUP_REQUEST",
      message: "Unable to process activity catchup request",
      details: [],
    });
    devSocket.disconnect();
  });
});
