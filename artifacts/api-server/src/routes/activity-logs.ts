import { Router } from "express";
import { db } from "@workspace/db";
import { activityLogsTable } from "@workspace/db";
import { eq, and, count, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const activityLogsRouter = Router();

activityLogsRouter.use(requireAuth);

activityLogsRouter.get("/activity-logs", async (req, res) => {
  const type = req.query.type as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;

  const conditions = [eq(activityLogsTable.tenantId, req.user!.tenantId)];
  if (type && type !== "all") conditions.push(eq(activityLogsTable.type, type));

  const where = and(...conditions);

  const [totalResult, logs] = await Promise.all([
    db.select({ count: count() }).from(activityLogsTable).where(where),
    db.select().from(activityLogsTable).where(where)
      .orderBy(desc(activityLogsTable.createdAt))
      .limit(limit).offset(offset),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  res.json({
    data: logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export default activityLogsRouter;
