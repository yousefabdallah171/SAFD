/**
 * Meta Webhooks endpoint
 *
 * GET  /webhooks/meta  — hub challenge verification (called by Meta when you subscribe)
 * POST /webhooks/meta  — receives real-time events (comments on posts/reels)
 *
 * Setup in Meta Developer Console:
 *   Callback URL : https://<your-domain>/api/webhooks/meta
 *   Verify Token : value of META_VERIFY_TOKEN env var
 *   Subscriptions: pages → feed (for Facebook), instagram → comments
 */

import { Router, Request, Response } from "express";
import { processComment, IncomingComment } from "../lib/automation-engine";
import { verifyWebhookSignature } from "../lib/meta-api";
import { logger } from "../lib/logger";

const webhooksRouter = Router();

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN ?? "safd-webhook-verify-token";
const APP_SECRET = process.env.META_APP_SECRET ?? "";

// ---------------------------------------------------------------------------
// GET — webhook subscription verification
// Meta calls this when you first register the webhook URL.
// It sends hub.mode=subscribe, hub.verify_token, hub.challenge.
// We must echo back hub.challenge if verify_token matches.
// ---------------------------------------------------------------------------
webhooksRouter.get("/webhooks/meta", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"] as string;
  const token = req.query["hub.verify_token"] as string;
  const challenge = req.query["hub.challenge"] as string;

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    logger.info("Meta webhook verified successfully");
    res.status(200).send(challenge);
  } else {
    logger.warn({ mode, token }, "Meta webhook verification failed — token mismatch");
    res.status(403).json({ error: "Forbidden", message: "Verify token mismatch" });
  }
});

// ---------------------------------------------------------------------------
// POST — receive webhook events
// All events arrive as application/json payloads.
// We verify the X-Hub-Signature-256 header when APP_SECRET is configured.
// ---------------------------------------------------------------------------
webhooksRouter.post("/webhooks/meta", async (req: Request, res: Response) => {
  // Verify signature (only if APP_SECRET is configured)
  if (APP_SECRET) {
    const sig = req.headers["x-hub-signature-256"] as string | undefined;
    if (!sig) {
      res.status(401).json({ error: "Unauthorized", message: "Missing signature" });
      return;
    }
    const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body);
    if (!verifyWebhookSignature(rawBody, sig, APP_SECRET)) {
      logger.warn("Meta webhook signature verification failed");
      res.status(401).json({ error: "Unauthorized", message: "Invalid signature" });
      return;
    }
  }

  // Respond 200 immediately — Meta requires a fast response or it will retry
  res.status(200).json({ received: true });

  // Process events asynchronously so we don't block the response
  processWebhookPayload(req.body).catch((err) => {
    logger.error({ err }, "Unhandled error in webhook payload processing");
  });
});

// ---------------------------------------------------------------------------
// Payload dispatcher
// ---------------------------------------------------------------------------
async function processWebhookPayload(payload: WebhookPayload): Promise<void> {
  if (!payload?.object || !payload?.entry) {
    return;
  }

  for (const entry of payload.entry) {
    // Facebook Page feed events
    if (payload.object === "page") {
      for (const change of entry.changes ?? []) {
        if (change.field === "feed" && change.value?.item === "comment") {
          await handleFacebookComment(entry, change.value);
        }
      }
    }

    // Instagram comment events
    if (payload.object === "instagram") {
      for (const change of entry.changes ?? []) {
        if (change.field === "comments") {
          await handleInstagramComment(entry, change.value);
        }
      }
    }
  }
}

async function handleFacebookComment(
  entry: WebhookEntry,
  value: FacebookCommentValue
): Promise<void> {
  // Only process new top-level comments (not replies to our own replies)
  if (value.verb !== "add" || value.parent_id === value.comment_id) {
    return;
  }

  // Extract post ID — value.post_id is "{page_id}_{post_id}"
  const metaPostId = value.post_id?.split("_")[1] ?? value.post_id ?? "";

  const incoming: IncomingComment = {
    metaCommentId: value.comment_id,
    metaPostId,
    authorId: value.from?.id ?? "",
    authorName: value.from?.name ?? "Unknown",
    text: value.message ?? "",
    platform: "facebook",
    receivedAt: value.created_time ? new Date(value.created_time * 1000) : new Date(),
  };

  logger.info({ commentId: incoming.metaCommentId, author: incoming.authorName }, "Processing Facebook comment");
  await processComment(incoming);
}

async function handleInstagramComment(
  entry: WebhookEntry,
  value: InstagramCommentValue
): Promise<void> {
  if (!value?.id || !value?.media?.id) return;

  const incoming: IncomingComment = {
    metaCommentId: value.id,
    metaPostId: value.media.id,
    authorId: value.from?.id ?? "",
    authorName: value.from?.username ?? "Unknown",
    text: value.text ?? "",
    platform: "instagram",
    receivedAt: new Date(),
  };

  logger.info({ commentId: incoming.metaCommentId, author: incoming.authorName }, "Processing Instagram comment");
  await processComment(incoming);
}

// ---------------------------------------------------------------------------
// Webhook payload type definitions
// ---------------------------------------------------------------------------
interface WebhookPayload {
  object: "page" | "instagram" | string;
  entry: WebhookEntry[];
}

interface WebhookEntry {
  id: string;
  time?: number;
  changes?: WebhookChange[];
}

interface WebhookChange {
  field: string;
  value: FacebookCommentValue & InstagramCommentValue & Record<string, unknown>;
}

interface FacebookCommentValue {
  item?: string;
  verb?: string;
  comment_id: string;
  post_id?: string;
  parent_id?: string;
  message?: string;
  created_time?: number;
  from?: { id: string; name: string };
}

interface InstagramCommentValue {
  id?: string;
  text?: string;
  media?: { id: string };
  from?: { id: string; username: string };
}

export default webhooksRouter;
