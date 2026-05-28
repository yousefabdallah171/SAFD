import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, tenantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword, comparePassword, signToken } from "../lib/auth";
import { requireAuth } from "../middlewares/requireAuth";
import { RegisterBody, LoginBody } from "@workspace/api-zod";

const authRouter = Router();

authRouter.post("/auth/register", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { email, password, name } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Conflict", message: "Email already registered" });
    return;
  }

  const hashed = await hashPassword(password);
  const [user] = await db.insert(usersTable).values({
    email,
    password: hashed,
    name,
    emailVerified: true,
  }).returning();

  const [tenant] = await db.insert(tenantsTable).values({
    userId: user.id,
    name: `${name}'s Workspace`,
  }).returning();

  const token = signToken({ userId: user.id, tenantId: tenant.id, email: user.email });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: tenant.id,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    },
  });
});

authRouter.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
    return;
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid email or password" });
    return;
  }

  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.userId, user.id)).limit(1);

  const token = signToken({ userId: user.id, tenantId: tenant.id, email: user.email });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: tenant.id,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    },
  });
});

authRouter.post("/auth/logout", (_req, res) => {
  res.json({ success: true, message: "Logged out" });
});

authRouter.get("/auth/me", requireAuth, async (req, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "Not found", message: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    tenantId: req.user!.tenantId,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
  });
});

export default authRouter;
