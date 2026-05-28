import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "../app";
import { db, usersTable, tenantsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

beforeAll(async () => {
  // Verify DB connection is available
  await db.execute(sql`SELECT 1`);
});

afterEach(async () => {
  // Clean up test data after each test (order matters: fk constraint)
  await db.delete(tenantsTable);
  await db.delete(usersTable);
});

afterAll(async () => {
  const { pool } = await import("@workspace/db");
  await pool.end();
});

describe("POST /api/auth/register", () => {
  it("creates a user and returns token + user data", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "newuser@example.com",
      password: "Password123!",
      name: "New User",
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe("newuser@example.com");
    expect(res.body.user.name).toBe("New User");
    expect(res.body.user).not.toHaveProperty("password");
  });

  it("returns 400 when email already registered", async () => {
    await request(app).post("/api/auth/register").send({
      email: "dup@example.com",
      password: "Password123!",
      name: "User One",
    });

    const res = await request(app).post("/api/auth/register").send({
      email: "dup@example.com",
      password: "Password123!",
      name: "User Two",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Conflict");
  });

  it("returns 400 for missing fields", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "missing@example.com",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation error");
  });
});

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    await request(app).post("/api/auth/register").send({
      email: "logintest@example.com",
      password: "SecurePass99!",
      name: "Login Test",
    });
  });

  it("returns token on valid credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "logintest@example.com",
      password: "SecurePass99!",
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.email).toBe("logintest@example.com");
  });

  it("returns 401 on wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "logintest@example.com",
      password: "WrongPassword!",
    });
    expect(res.status).toBe(401);
  });

  it("returns 401 on unknown email", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "nobody@example.com",
      password: "whatever",
    });
    expect(res.status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("always returns success", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with invalid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid.token.here");
    expect(res.status).toBe(401);
  });

  it("returns user data with valid token", async () => {
    const reg = await request(app).post("/api/auth/register").send({
      email: "metest@example.com",
      password: "Password123!",
      name: "Me Test",
    });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${reg.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("metest@example.com");
  });
});
