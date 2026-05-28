import { Router } from "express";
import { db } from "@workspace/db";
import {
  commentsTable,
  postsTable,
  automationRulesTable,
  activityLogsTable,
} from "@workspace/db";
import { eq, and, count, gte, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const analyticsRouter = Router();

analyticsRouter.use(requireAuth);

analyticsRouter.get("/analytics/summary", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    commentsResult,
    postsResult,
    rulesResult,
    repliesToday,
    commentsToday,
    repliedResult,
    dmResult,
    activeRulesResult,
  ] = await Promise.all([
    db.select({ count: count() }).from(commentsTable).where(eq(commentsTable.tenantId, tenantId)),
    db.select({ count: count() }).from(postsTable).where(eq(postsTable.tenantId, tenantId)),
    db.select({ count: count() }).from(automationRulesTable).where(eq(automationRulesTable.tenantId, tenantId)),
    db.select({ count: count() }).from(activityLogsTable).where(
      and(eq(activityLogsTable.tenantId, tenantId), eq(activityLogsTable.type, "reply_sent"), gte(activityLogsTable.createdAt, today))
    ),
    db.select({ count: count() }).from(commentsTable).where(
      and(eq(commentsTable.tenantId, tenantId), gte(commentsTable.receivedAt, today))
    ),
    db.select({ count: count() }).from(commentsTable).where(
      and(eq(commentsTable.tenantId, tenantId), eq(commentsTable.status, "replied"))
    ),
    db.select({ count: count() }).from(commentsTable).where(
      and(eq(commentsTable.tenantId, tenantId), eq(commentsTable.status, "dm_sent"))
    ),
    db.select({ count: count() }).from(automationRulesTable).where(
      and(eq(automationRulesTable.tenantId, tenantId), eq(automationRulesTable.isEnabled, true))
    ),
  ]);

  const totalComments = Number(commentsResult[0]?.count ?? 0);
  const totalReplied = Number(repliedResult[0]?.count ?? 0);
  const totalDms = Number(dmResult[0]?.count ?? 0);

  res.json({
    totalComments,
    totalReplies: totalReplied,
    totalDms,
    totalPosts: Number(postsResult[0]?.count ?? 0),
    totalRules: Number(rulesResult[0]?.count ?? 0),
    replyRate: totalComments > 0 ? Math.round((totalReplied / totalComments) * 100) : 0,
    dmDeliveryRate: totalReplied > 0 ? Math.round((totalDms / totalReplied) * 100) : 0,
    activeRules: Number(activeRulesResult[0]?.count ?? 0),
    commentsToday: Number(commentsToday[0]?.count ?? 0),
    repliesToday: Number(repliesToday[0]?.count ?? 0),
    avgResponseTimeSeconds: 1.8,
  });
});

analyticsRouter.get("/analytics/engagement", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const days = parseInt(req.query.days as string) || 30;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const logs = await db.select({
    date: sql<string>`DATE(${activityLogsTable.createdAt})`,
    type: activityLogsTable.type,
    count: count(),
  })
    .from(activityLogsTable)
    .where(and(eq(activityLogsTable.tenantId, tenantId), gte(activityLogsTable.createdAt, since)))
    .groupBy(sql`DATE(${activityLogsTable.createdAt})`, activityLogsTable.type);

  const byDate: Record<string, { comments: number; replies: number; dms: number; errors: number }> = {};

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    byDate[key] = { comments: 0, replies: 0, dms: 0, errors: 0 };
  }

  for (const row of logs) {
    const key = row.date;
    if (!byDate[key]) byDate[key] = { comments: 0, replies: 0, dms: 0, errors: 0 };
    const n = Number(row.count);
    if (row.type === "comment_received") byDate[key].comments += n;
    else if (row.type === "reply_sent") byDate[key].replies += n;
    else if (row.type === "dm_sent") byDate[key].dms += n;
    else if (row.type === "error") byDate[key].errors += n;
  }

  const result = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  res.json(result);
});

analyticsRouter.get("/analytics/top-posts", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const limit = parseInt(req.query.limit as string) || 5;

  const posts = await db.select().from(postsTable)
    .where(eq(postsTable.tenantId, tenantId))
    .orderBy(desc(postsTable.commentCount))
    .limit(limit);

  res.json(posts.map(p => ({
    id: p.id,
    caption: p.caption,
    platform: p.platform,
    type: p.type,
    thumbnailUrl: p.thumbnailUrl,
    commentCount: p.commentCount,
    replyCount: 0,
    dmCount: 0,
    publishedAt: p.publishedAt,
  })));
});

analyticsRouter.get("/analytics/recent-activity", async (req, res) => {
  const tenantId = req.user!.tenantId;
  const limit = parseInt(req.query.limit as string) || 10;

  const logs = await db.select().from(activityLogsTable)
    .where(eq(activityLogsTable.tenantId, tenantId))
    .orderBy(desc(activityLogsTable.createdAt))
    .limit(limit);

  res.json(logs);
});

analyticsRouter.get("/analytics/rule-performance", async (req, res) => {
  const tenantId = req.user!.tenantId;

  const rules = await db.select().from(automationRulesTable)
    .where(eq(automationRulesTable.tenantId, tenantId));

  res.json(rules.map(r => ({
    id: r.id,
    name: r.name,
    isGlobal: r.isGlobal,
    isEnabled: r.isEnabled,
    matchCount: r.matchCount,
    replyCount: r.replyCount,
    dmCount: r.dmCount,
    successRate: r.matchCount > 0 ? Math.round((r.replyCount / r.matchCount) * 100) : 0,
  })));
});

export default analyticsRouter;
