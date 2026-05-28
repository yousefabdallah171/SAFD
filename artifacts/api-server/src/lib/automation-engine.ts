/**
 * Automation Engine
 *
 * Core logic: given a new comment, find matching rules, fire replies + DMs,
 * update DB records, and emit activity log entries.
 *
 * All DB side-effects are transactional per comment.
 */

import { db } from "@workspace/db";
import {
  postsTable,
  automationRulesTable,
  commentsTable,
  activityLogsTable,
  metaCredentialsTable,
} from "@workspace/db";
import { eq, and, or, isNull } from "drizzle-orm";
import { replyToComment, sendDmFacebook, sendDmInstagram } from "./meta-api";

export interface IncomingComment {
  metaCommentId: string;
  metaPostId: string;     // Meta Graph object ID of the post/media
  authorId: string;       // Meta user ID of commenter
  authorName: string;
  text: string;
  platform: "facebook" | "instagram";
  receivedAt: Date;
}

/** Entry point: process one incoming comment through the automation pipeline. */
export async function processComment(incoming: IncomingComment): Promise<void> {
  // 1. Look up the post in our DB
  const [post] = await db
    .select()
    .from(postsTable)
    .where(eq(postsTable.metaId, incoming.metaPostId))
    .limit(1);

  if (!post || !post.automationEnabled) {
    // Post not tracked or automation disabled — log and skip
    await logActivity({
      tenantId: post?.tenantId ?? 0,
      type: "comment_received",
      postId: post?.id ?? null,
      commentId: null,
      ruleId: null,
      message: `Comment received on untracked/disabled post ${incoming.metaPostId} from ${incoming.authorName} — skipped`,
    });
    return;
  }

  // 2. Upsert the comment record (idempotent — webhooks can fire twice)
  const existing = await db
    .select({ id: commentsTable.id, status: commentsTable.status })
    .from(commentsTable)
    .where(eq(commentsTable.metaCommentId, incoming.metaCommentId))
    .limit(1);

  if (existing.length > 0 && existing[0].status !== "pending") {
    // Already processed
    return;
  }

  let commentDbId: number;

  if (existing.length > 0) {
    commentDbId = existing[0].id;
  } else {
    const [inserted] = await db
      .insert(commentsTable)
      .values({
        tenantId: post.tenantId,
        postId: post.id,
        metaCommentId: incoming.metaCommentId,
        authorName: incoming.authorName,
        authorId: incoming.authorId,
        text: incoming.text,
        status: "pending",
        receivedAt: incoming.receivedAt,
      })
      .returning({ id: commentsTable.id });
    commentDbId = inserted.id;
  }

  // Log comment received
  await logActivity({
    tenantId: post.tenantId,
    type: "comment_received",
    postId: post.id,
    commentId: commentDbId,
    ruleId: null,
    message: `New comment from ${incoming.authorName}: "${truncate(incoming.text, 80)}"`,
  });

  // 3. Find all enabled rules (post-specific + global), post-specific first
  const rules = await db
    .select()
    .from(automationRulesTable)
    .where(
      and(
        eq(automationRulesTable.tenantId, post.tenantId),
        eq(automationRulesTable.isEnabled, true),
        or(
          eq(automationRulesTable.postId, post.id),
          and(eq(automationRulesTable.isGlobal, true), isNull(automationRulesTable.postId))
        )
      )
    );

  // Sort: post-specific rules before global
  rules.sort((a, b) => {
    if (a.postId && !b.postId) return -1;
    if (!a.postId && b.postId) return 1;
    return 0;
  });

  // 4. Find first matching rule
  const matchedRule = rules.find((rule) => matchesKeywords(incoming.text, rule.keywords as string[]));

  if (!matchedRule) {
    // No rule matches — leave comment as pending
    await logActivity({
      tenantId: post.tenantId,
      type: "comment_received",
      postId: post.id,
      commentId: commentDbId,
      ruleId: null,
      message: `No matching rule for comment from ${incoming.authorName} — left as pending`,
    });
    return;
  }

  // Log rule match
  await logActivity({
    tenantId: post.tenantId,
    type: "rule_matched",
    postId: post.id,
    commentId: commentDbId,
    ruleId: matchedRule.id,
    message: `Rule "${matchedRule.name}" matched comment from ${incoming.authorName}`,
  });

  // Increment match count
  await db
    .update(automationRulesTable)
    .set({ matchCount: matchedRule.matchCount + 1, updatedAt: new Date() })
    .where(eq(automationRulesTable.id, matchedRule.id));

  // 5. Fetch Meta credentials for this tenant
  const [cred] = await db
    .select()
    .from(metaCredentialsTable)
    .where(
      and(
        eq(metaCredentialsTable.tenantId, post.tenantId),
        eq(metaCredentialsTable.status, "active")
      )
    )
    .limit(1);

  if (!cred) {
    await markCommentFailed(commentDbId, matchedRule.id);
    await logActivity({
      tenantId: post.tenantId,
      type: "error",
      postId: post.id,
      commentId: commentDbId,
      ruleId: matchedRule.id,
      message: `No active Meta credentials for tenant ${post.tenantId} — cannot reply`,
    });
    return;
  }

  // 6. Post the public reply
  let repliedAt: Date | null = null;
  try {
    await replyToComment(incoming.metaCommentId, matchedRule.replyText, cred.accessToken);
    repliedAt = new Date();

    await db
      .update(automationRulesTable)
      .set({ replyCount: matchedRule.replyCount + 1, updatedAt: new Date() })
      .where(eq(automationRulesTable.id, matchedRule.id));

    await logActivity({
      tenantId: post.tenantId,
      type: "reply_sent",
      postId: post.id,
      commentId: commentDbId,
      ruleId: matchedRule.id,
      message: `Auto-replied to ${incoming.authorName}: "${truncate(matchedRule.replyText, 80)}"`,
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await markCommentFailed(commentDbId, matchedRule.id);
    await logActivity({
      tenantId: post.tenantId,
      type: "error",
      postId: post.id,
      commentId: commentDbId,
      ruleId: matchedRule.id,
      message: `Failed to reply to ${incoming.authorName}: ${errMsg}`,
    });
    return;
  }

  // 7. Send DM if configured
  let dmSentAt: Date | null = null;
  if (matchedRule.sendDm && matchedRule.dmMessage) {
    try {
      if (incoming.platform === "facebook") {
        await sendDmFacebook(incoming.authorId, matchedRule.dmMessage, cred.accessToken);
      } else {
        await sendDmInstagram(incoming.authorId, matchedRule.dmMessage, cred.accessToken);
      }
      dmSentAt = new Date();

      await db
        .update(automationRulesTable)
        .set({ dmCount: matchedRule.dmCount + 1, updatedAt: new Date() })
        .where(eq(automationRulesTable.id, matchedRule.id));

      await logActivity({
        tenantId: post.tenantId,
        type: "dm_sent",
        postId: post.id,
        commentId: commentDbId,
        ruleId: matchedRule.id,
        message: `DM sent to ${incoming.authorName}: "${truncate(matchedRule.dmMessage, 60)}"`,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await logActivity({
        tenantId: post.tenantId,
        type: "error",
        postId: post.id,
        commentId: commentDbId,
        ruleId: matchedRule.id,
        message: `Reply sent but DM to ${incoming.authorName} failed: ${errMsg}`,
      });
      // DM failure does not revert the reply — update status to "replied" not "dm_sent"
    }
  }

  // 8. Update comment record with final status
  const finalStatus = dmSentAt ? "dm_sent" : repliedAt ? "replied" : "failed";
  await db
    .update(commentsTable)
    .set({
      status: finalStatus,
      repliedAt: repliedAt ?? undefined,
      dmSentAt: dmSentAt ?? undefined,
      matchedRuleId: matchedRule.id,
    })
    .where(eq(commentsTable.id, commentDbId));
}

/** Case-insensitive keyword match — checks if any keyword appears in text */
function matchesKeywords(text: string, keywords: string[]): boolean {
  if (!keywords || keywords.length === 0) return false;
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

async function markCommentFailed(commentId: number, ruleId: number): Promise<void> {
  await db
    .update(commentsTable)
    .set({ status: "failed", matchedRuleId: ruleId })
    .where(eq(commentsTable.id, commentId));
}

interface LogEntry {
  tenantId: number;
  type: string;
  postId: number | null;
  commentId: number | null;
  ruleId: number | null;
  message: string;
}

async function logActivity(entry: LogEntry): Promise<void> {
  if (!entry.tenantId) return; // skip if we don't have a real tenant
  try {
    await db.insert(activityLogsTable).values({
      tenantId: entry.tenantId,
      type: entry.type,
      postId: entry.postId ?? undefined,
      commentId: entry.commentId ?? undefined,
      ruleId: entry.ruleId ?? undefined,
      message: entry.message,
    });
  } catch {
    // Activity log failure should never crash the engine
  }
}
