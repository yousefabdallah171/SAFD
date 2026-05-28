import { Router } from "express";
import { db } from "@workspace/db";
import { automationRulesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { CreateRuleBody, UpdateRuleBody, ToggleRuleBody } from "@workspace/api-zod";

const rulesRouter = Router();

rulesRouter.use(requireAuth);

rulesRouter.get("/rules", async (req, res) => {
  const postId = req.query.postId ? parseInt(req.query.postId as string) : undefined;
  const isGlobal = req.query.isGlobal !== undefined ? req.query.isGlobal === "true" : undefined;

  const conditions = [eq(automationRulesTable.tenantId, req.user!.tenantId)];
  if (postId !== undefined) conditions.push(eq(automationRulesTable.postId, postId));
  if (isGlobal !== undefined) conditions.push(eq(automationRulesTable.isGlobal, isGlobal));

  const rules = await db.select().from(automationRulesTable).where(and(...conditions));
  res.json(rules);
});

rulesRouter.post("/rules", async (req, res) => {
  const parsed = CreateRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { postId, isGlobal, name, keywords, replyText, dmMessage, sendDm } = parsed.data;

  const [rule] = await db.insert(automationRulesTable).values({
    tenantId: req.user!.tenantId,
    postId: postId ?? null,
    isGlobal: isGlobal ?? false,
    name,
    keywords: keywords ?? [],
    replyText,
    dmMessage: dmMessage ?? null,
    sendDm: sendDm ?? false,
    isEnabled: true,
  }).returning();

  res.status(201).json(rule);
});

rulesRouter.get("/rules/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [rule] = await db.select().from(automationRulesTable)
    .where(and(eq(automationRulesTable.id, id), eq(automationRulesTable.tenantId, req.user!.tenantId)))
    .limit(1);

  if (!rule) {
    res.status(404).json({ error: "Not found", message: "Rule not found" });
    return;
  }

  res.json(rule);
});

rulesRouter.put("/rules/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = UpdateRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  const { name, keywords, replyText, dmMessage, sendDm, isEnabled } = parsed.data;
  if (name !== undefined) updateData.name = name;
  if (keywords !== undefined) updateData.keywords = keywords;
  if (replyText !== undefined) updateData.replyText = replyText;
  if (dmMessage !== undefined) updateData.dmMessage = dmMessage;
  if (sendDm !== undefined) updateData.sendDm = sendDm;
  if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
  updateData.updatedAt = new Date();

  const [updated] = await db.update(automationRulesTable)
    .set(updateData)
    .where(and(eq(automationRulesTable.id, id), eq(automationRulesTable.tenantId, req.user!.tenantId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found", message: "Rule not found" });
    return;
  }

  res.json(updated);
});

rulesRouter.delete("/rules/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(automationRulesTable)
    .where(and(eq(automationRulesTable.id, id), eq(automationRulesTable.tenantId, req.user!.tenantId)));

  res.json({ success: true, message: "Rule deleted" });
});

rulesRouter.post("/rules/:id/toggle", async (req, res) => {
  const id = parseInt(req.params.id);
  const parsed = ToggleRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const [updated] = await db.update(automationRulesTable)
    .set({ isEnabled: parsed.data.isEnabled, updatedAt: new Date() })
    .where(and(eq(automationRulesTable.id, id), eq(automationRulesTable.tenantId, req.user!.tenantId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Not found", message: "Rule not found" });
    return;
  }

  res.json(updated);
});

export default rulesRouter;
