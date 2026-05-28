import { Router } from "express";
import { db } from "@workspace/db";
import { commentsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const commentsRouter = Router();

commentsRouter.use(requireAuth);

commentsRouter.get("/comments", async (req, res) => {
  const postId = req.query.postId ? parseInt(req.query.postId as string) : undefined;
  const status = req.query.status as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const offset = (page - 1) * limit;

  const conditions = [eq(commentsTable.tenantId, req.user!.tenantId)];
  if (postId) conditions.push(eq(commentsTable.postId, postId));
  if (status && status !== "all") conditions.push(eq(commentsTable.status, status));

  const where = and(...conditions);

  const [totalResult, comments] = await Promise.all([
    db.select({ count: count() }).from(commentsTable).where(where),
    db.select().from(commentsTable).where(where)
      .orderBy(commentsTable.receivedAt)
      .limit(limit).offset(offset),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  res.json({
    data: comments,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

export default commentsRouter;
