import { Router } from "express";
import { db } from "@workspace/db";
import { postsTable, automationRulesTable, metaCredentialsTable } from "@workspace/db";
import { eq, and, ilike, sql, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { fetchFacebookPosts, fetchInstagramMedia } from "../lib/meta-api";
import { logger } from "../lib/logger";

const postsRouter = Router();

postsRouter.use(requireAuth);

postsRouter.get("/posts", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string | undefined;
  const type = req.query.type as string | undefined;
  const platform = req.query.platform as string | undefined;
  const offset = (page - 1) * limit;

  const conditions = [eq(postsTable.tenantId, req.user!.tenantId)];
  if (search) conditions.push(ilike(postsTable.caption, `%${search}%`));
  if (type && type !== "all") conditions.push(eq(postsTable.type, type));
  if (platform && platform !== "all") conditions.push(eq(postsTable.platform, platform));

  const where = and(...conditions);

  const [totalResult, posts] = await Promise.all([
    db.select({ count: count() }).from(postsTable).where(where),
    db.select().from(postsTable).where(where)
      .orderBy(sql`${postsTable.publishedAt} DESC`)
      .limit(limit).offset(offset),
  ]);

  const total = Number(totalResult[0]?.count ?? 0);

  const rulesCountByPost = await db
    .select({ postId: automationRulesTable.postId, count: count() })
    .from(automationRulesTable)
    .where(eq(automationRulesTable.tenantId, req.user!.tenantId))
    .groupBy(automationRulesTable.postId);

  const rulesMap = new Map(rulesCountByPost.map(r => [r.postId, Number(r.count)]));

  res.json({
    data: posts.map(p => ({
      ...p,
      rulesCount: rulesMap.get(p.id) ?? 0,
    })),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

postsRouter.post("/posts/sync", async (req, res) => {
  const tenantId = req.user!.tenantId;

  // Fetch active Meta credentials for this tenant
  const creds = await db
    .select()
    .from(metaCredentialsTable)
    .where(and(
      eq(metaCredentialsTable.tenantId, tenantId),
      eq(metaCredentialsTable.status, "active"),
    ));

  if (creds.length === 0) {
    res.status(400).json({
      error: "No credentials",
      message: "No active Meta API credentials found. Add credentials in Settings first.",
    });
    return;
  }

  let synced = 0;
  let errors = 0;

  for (const cred of creds) {
    // Facebook posts
    if (cred.platform === "facebook" || cred.platform === "both") {
      try {
        const fbPosts = await fetchFacebookPosts(cred.accessToken);
        for (const post of fbPosts) {
          await upsertPost({
            tenantId,
            metaId: post.id,
            platform: "facebook",
            type: "post",
            caption: post.message ?? post.story ?? null,
            thumbnailUrl: post.full_picture ?? null,
            permalink: post.permalink_url ?? null,
            commentCount: post.comments?.summary?.total_count ?? 0,
            likeCount: post.reactions?.summary?.total_count ?? 0,
            publishedAt: new Date(post.created_time),
          });
          synced++;
        }
      } catch (err) {
        errors++;
        logger.error({ err, tenantId }, "Failed to sync Facebook posts");
      }
    }

    // Instagram media
    if (cred.platform === "instagram" || cred.platform === "both") {
      try {
        const igMedia = await fetchInstagramMedia(cred.accessToken);
        for (const media of igMedia) {
          const isReel = media.media_type === "VIDEO" || media.media_type === "REELS";
          await upsertPost({
            tenantId,
            metaId: media.id,
            platform: "instagram",
            type: isReel ? "reel" : "post",
            caption: media.caption ?? null,
            thumbnailUrl: media.thumbnail_url ?? null,
            permalink: media.permalink ?? null,
            commentCount: media.comments_count ?? 0,
            likeCount: media.like_count ?? 0,
            publishedAt: new Date(media.timestamp),
          });
          synced++;
        }
      } catch (err) {
        errors++;
        logger.error({ err, tenantId }, "Failed to sync Instagram media");
      }
    }
  }

  res.json({
    success: true,
    synced,
    errors,
    message: errors > 0
      ? `Synced ${synced} posts with ${errors} error(s) — check your credentials`
      : `Successfully synced ${synced} posts`,
  });
});

postsRouter.get("/posts/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const [post] = await db.select().from(postsTable)
    .where(and(eq(postsTable.id, id), eq(postsTable.tenantId, req.user!.tenantId)))
    .limit(1);

  if (!post) {
    res.status(404).json({ error: "Not found", message: "Post not found" });
    return;
  }

  const [rulesCount] = await db.select({ count: count() }).from(automationRulesTable)
    .where(and(eq(automationRulesTable.postId, id), eq(automationRulesTable.tenantId, req.user!.tenantId)));

  res.json({ ...post, rulesCount: Number(rulesCount?.count ?? 0) });
});

interface PostUpsert {
  tenantId: number;
  metaId: string;
  platform: string;
  type: string;
  caption: string | null;
  thumbnailUrl: string | null;
  permalink: string | null;
  commentCount: number;
  likeCount: number;
  publishedAt: Date;
}

async function upsertPost(data: PostUpsert): Promise<void> {
  const existing = await db
    .select({ id: postsTable.id })
    .from(postsTable)
    .where(and(eq(postsTable.metaId, data.metaId), eq(postsTable.tenantId, data.tenantId)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(postsTable)
      .set({
        caption: data.caption,
        thumbnailUrl: data.thumbnailUrl,
        permalink: data.permalink,
        commentCount: data.commentCount,
        likeCount: data.likeCount,
        syncedAt: new Date(),
      })
      .where(eq(postsTable.id, existing[0].id));
  } else {
    await db.insert(postsTable).values({
      tenantId: data.tenantId,
      metaId: data.metaId,
      platform: data.platform,
      type: data.type,
      caption: data.caption,
      thumbnailUrl: data.thumbnailUrl,
      permalink: data.permalink,
      commentCount: data.commentCount,
      likeCount: data.likeCount,
      publishedAt: data.publishedAt,
    });
  }
}

export default postsRouter;
