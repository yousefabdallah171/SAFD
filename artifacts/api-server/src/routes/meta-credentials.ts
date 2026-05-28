import { Router } from "express";
import { db } from "@workspace/db";
import { metaCredentialsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { CreateMetaCredentialBody } from "@workspace/api-zod";

const metaCredentialsRouter = Router();

metaCredentialsRouter.use(requireAuth);

metaCredentialsRouter.get("/meta-credentials", async (req, res) => {
  const creds = await db.select().from(metaCredentialsTable)
    .where(eq(metaCredentialsTable.tenantId, req.user!.tenantId));

  res.json(creds.map(c => ({
    id: c.id,
    tenantId: c.tenantId,
    appId: c.appId,
    tokenPreview: `****${c.accessToken.slice(-4)}`,
    platform: c.platform,
    status: c.status,
    connectedAt: c.connectedAt,
  })));
});

metaCredentialsRouter.post("/meta-credentials", async (req, res) => {
  const parsed = CreateMetaCredentialBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }

  const { appId, appSecret, accessToken, platform } = parsed.data;

  const [cred] = await db.insert(metaCredentialsTable).values({
    tenantId: req.user!.tenantId,
    appId,
    appSecret,
    accessToken,
    platform: platform ?? "both",
    status: "active",
  }).returning();

  res.status(201).json({
    id: cred.id,
    tenantId: cred.tenantId,
    appId: cred.appId,
    tokenPreview: `****${cred.accessToken.slice(-4)}`,
    platform: cred.platform,
    status: cred.status,
    connectedAt: cred.connectedAt,
  });
});

metaCredentialsRouter.delete("/meta-credentials/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(metaCredentialsTable)
    .where(and(
      eq(metaCredentialsTable.id, id),
      eq(metaCredentialsTable.tenantId, req.user!.tenantId)
    ));

  res.json({ success: true, message: "Credential deleted" });
});

export default metaCredentialsRouter;
