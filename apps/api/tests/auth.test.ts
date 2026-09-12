import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/prisma.js";

const app = createApp();

describe("Authentication & Session Lifecycle", () => {
  beforeAll(async () => {
    // Ensure DB connection is alive
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should successfully log in a valid user and return access token + set HttpOnly cookie", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@velozity.com", password: "Password123!" });

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe("admin@velozity.com");
    expect(res.body.data.user.role).toBe("ADMIN");

    // Verify HttpOnly cookie
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    const refreshCookie = (cookies as unknown as string[]).find((c: string) =>
      c.startsWith("refreshToken="),
    );
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toContain("HttpOnly");
  });

  it("should reject invalid login credentials with 401", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "admin@velozity.com", password: "WrongPassword" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("should reject login with non-existent email with 401", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "unknown@velozity.com", password: "Password123!" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("should support refresh-token rotation and revoke previous session", async () => {
    // 1. Log in
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "pm1@velozity.com", password: "Password123!" });

    const cookies = loginRes.headers["set-cookie"];
    const initialCookie = (cookies as unknown as string[]).find((c: string) =>
      c.startsWith("refreshToken="),
    );

    // 2. Call refresh
    const refreshRes1 = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", initialCookie!);

    expect(refreshRes1.status).toBe(200);
    expect(refreshRes1.body.data.accessToken).toBeDefined();

    const newCookies = refreshRes1.headers["set-cookie"];
    const rotatedCookie = (newCookies as unknown as string[]).find((c: string) =>
      c.startsWith("refreshToken="),
    );
    expect(rotatedCookie).toBeDefined();

    // 3. Reusing the old refresh token MUST fail (replay attack prevention)
    const replayRes = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", initialCookie!);

    expect(replayRes.status).toBe(401);
    expect(replayRes.body.error.code).toBe("UNAUTHORIZED");

    // 4. Using the new rotated cookie should succeed
    const refreshRes2 = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", rotatedCookie!);

    expect(refreshRes2.status).toBe(200);
  });

  it("should properly log out and revoke refresh session", async () => {
    // 1. Log in
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "dev1@velozity.com", password: "Password123!" });

    const cookies = loginRes.headers["set-cookie"];
    const cookie = (cookies as unknown as string[]).find((c: string) =>
      c.startsWith("refreshToken="),
    );

    // 2. Log out
    const logoutRes = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie!);

    expect(logoutRes.status).toBe(200);

    // 3. Try refreshing with logged out cookie
    const refreshRes = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", cookie!);

    expect(refreshRes.status).toBe(401);
  });

  it("should reject an access token after its refresh session is revoked", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "dev1@velozity.com", password: "Password123!" });
    const token = loginRes.body.data.accessToken;
    const cookie = (loginRes.headers["set-cookie"] as unknown as string[]).find((value: string) =>
      value.startsWith("refreshToken="),
    );

    await request(app).post("/api/v1/auth/logout").set("Cookie", cookie!);

    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(401);
    expect(meRes.body.error.code).toBe("UNAUTHORIZED");
  });

  it("should allow only one concurrent refresh request to rotate a refresh token", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "dev1@velozity.com", password: "Password123!" });
    const cookie = (loginRes.headers["set-cookie"] as unknown as string[]).find((value: string) =>
      value.startsWith("refreshToken="),
    );

    const results = await Promise.all([
      request(app).post("/api/v1/auth/refresh").set("Cookie", cookie!),
      request(app).post("/api/v1/auth/refresh").set("Cookie", cookie!),
    ]);

    expect(results.filter((result) => result.status === 200)).toHaveLength(1);
    expect(results.filter((result) => result.status === 401)).toHaveLength(1);
  });

  it("should deny access to /api/v1/auth/me without token", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  it("should allow access to /api/v1/auth/me with valid Bearer token", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "dev1@velozity.com", password: "Password123!" });

    const token = loginRes.body.data.accessToken;

    const meRes = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe("dev1@velozity.com");
    expect(meRes.body.data.role).toBe("DEVELOPER");
  });
});
