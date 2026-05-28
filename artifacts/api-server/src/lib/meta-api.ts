/**
 * Meta Graph API client.
 * All methods take an access_token so we use per-tenant credentials.
 */

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export interface MetaPost {
  id: string;
  message?: string;
  story?: string;
  created_time: string;
  permalink_url?: string;
  full_picture?: string;
  comments?: { summary?: { total_count?: number } };
  reactions?: { summary?: { total_count?: number } };
}

export interface MetaMedia {
  id: string;
  caption?: string;
  media_type: string;
  timestamp: string;
  permalink?: string;
  thumbnail_url?: string;
  like_count?: number;
  comments_count?: number;
}

export interface MetaComment {
  id: string;
  message: string;
  from?: { id: string; name: string };
  created_time: string;
}

async function graphFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`;
  const res = await fetch(url, { ...opts });
  const body = await res.json() as T & { error?: { message: string; code: number } };
  if (!res.ok || (body as Record<string, unknown>).error) {
    const errBody = (body as Record<string, unknown>).error as { message: string } | undefined;
    throw new Error(`Meta API error: ${errBody?.message ?? res.statusText} (${res.status})`);
  }
  return body;
}

/** Post a public reply to a comment */
export async function replyToComment(
  commentId: string,
  message: string,
  accessToken: string
): Promise<{ id: string }> {
  const params = new URLSearchParams({ message, access_token: accessToken });
  return graphFetch<{ id: string }>(`/${commentId}/comments`, {
    method: "POST",
    body: params,
  });
}

/** Send a private DM to a user via the Messenger Send API (Facebook Pages) */
export async function sendDmFacebook(
  recipientPsid: string,
  message: string,
  pageAccessToken: string
): Promise<{ recipient_id: string; message_id: string }> {
  return graphFetch<{ recipient_id: string; message_id: string }>(`/me/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientPsid },
      message: { text: message },
      access_token: pageAccessToken,
    }),
  });
}

/** Send a private DM via Instagram Messaging API */
export async function sendDmInstagram(
  recipientIgId: string,
  message: string,
  pageAccessToken: string
): Promise<{ recipient_id: string; message_id: string }> {
  return graphFetch<{ recipient_id: string; message_id: string }>(`/me/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientIgId },
      message: { text: message },
      access_token: pageAccessToken,
    }),
  });
}

/** Fetch all Facebook Page posts for a given user token */
export async function fetchFacebookPosts(
  accessToken: string,
  pageId = "me"
): Promise<MetaPost[]> {
  const fields = "id,message,story,created_time,permalink_url,full_picture,comments.summary(true),reactions.summary(true)";
  const params = new URLSearchParams({ fields, limit: "50", access_token: accessToken });
  const data = await graphFetch<{ data: MetaPost[]; paging?: { next?: string } }>(
    `/${pageId}/posts?${params}`
  );
  return data.data ?? [];
}

/** Fetch all Instagram media for a connected IG account */
export async function fetchInstagramMedia(
  accessToken: string,
  igUserId = "me"
): Promise<MetaMedia[]> {
  const fields = "id,caption,media_type,timestamp,permalink,thumbnail_url,like_count,comments_count";
  const params = new URLSearchParams({ fields, limit: "50", access_token: accessToken });
  const data = await graphFetch<{ data: MetaMedia[]; paging?: { next?: string } }>(
    `/${igUserId}/media?${params}`
  );
  return data.data ?? [];
}

/** Verify a webhook hub challenge */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  appSecret: string
): boolean {
  try {
    // Dynamic import is not available here; use native crypto
    const crypto = require("crypto") as typeof import("crypto");
    const expected = "sha256=" + crypto
      .createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
