import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const tenantsTable = pgTable("tenants", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const metaCredentialsTable = pgTable("meta_credentials", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  appId: varchar("app_id", { length: 255 }).notNull(),
  appSecret: text("app_secret").notNull(),
  accessToken: text("access_token").notNull(),
  platform: varchar("platform", { length: 50 }).notNull().default("both"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
}, (t) => [index("meta_credentials_tenant_idx").on(t.tenantId)]);

export const postsTable = pgTable("posts", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  metaId: varchar("meta_id", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("post"),
  caption: text("caption"),
  thumbnailUrl: text("thumbnail_url"),
  permalink: text("permalink"),
  commentCount: integer("comment_count").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  automationEnabled: boolean("automation_enabled").notNull().default(true),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
}, (t) => [
  index("posts_tenant_idx").on(t.tenantId),
  index("posts_meta_id_idx").on(t.metaId),
]);

export const automationRulesTable = pgTable("automation_rules", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  postId: integer("post_id").references(() => postsTable.id),
  isGlobal: boolean("is_global").notNull().default(false),
  name: varchar("name", { length: 255 }).notNull(),
  keywords: jsonb("keywords").notNull().$type<string[]>().default([]),
  replyText: text("reply_text").notNull(),
  dmMessage: text("dm_message"),
  sendDm: boolean("send_dm").notNull().default(false),
  isEnabled: boolean("is_enabled").notNull().default(true),
  matchCount: integer("match_count").notNull().default(0),
  replyCount: integer("reply_count").notNull().default(0),
  dmCount: integer("dm_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("rules_tenant_idx").on(t.tenantId),
  index("rules_post_idx").on(t.postId),
]);

export const commentsTable = pgTable("comments", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  postId: integer("post_id").notNull().references(() => postsTable.id),
  metaCommentId: varchar("meta_comment_id", { length: 255 }).notNull().unique(),
  authorName: varchar("author_name", { length: 255 }).notNull(),
  authorId: varchar("author_id", { length: 255 }).notNull(),
  text: text("text").notNull(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  matchedRuleId: integer("matched_rule_id").references(() => automationRulesTable.id),
  repliedAt: timestamp("replied_at"),
  dmSentAt: timestamp("dm_sent_at"),
  receivedAt: timestamp("received_at").notNull().defaultNow(),
}, (t) => [
  index("comments_tenant_idx").on(t.tenantId),
  index("comments_post_idx").on(t.postId),
  index("comments_status_idx").on(t.status),
]);

export const activityLogsTable = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  type: varchar("type", { length: 100 }).notNull(),
  postId: integer("post_id").references(() => postsTable.id),
  commentId: integer("comment_id").references(() => commentsTable.id),
  ruleId: integer("rule_id").references(() => automationRulesTable.id),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("activity_logs_tenant_idx").on(t.tenantId),
  index("activity_logs_type_idx").on(t.type),
]);

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTenantSchema = createInsertSchema(tenantsTable).omit({ id: true, createdAt: true });
export const insertMetaCredentialSchema = createInsertSchema(metaCredentialsTable).omit({ id: true, connectedAt: true });
export const insertPostSchema = createInsertSchema(postsTable).omit({ id: true, syncedAt: true });
export const insertRuleSchema = createInsertSchema(automationRulesTable).omit({ id: true, createdAt: true, updatedAt: true, matchCount: true, replyCount: true, dmCount: true });
export const insertCommentSchema = createInsertSchema(commentsTable).omit({ id: true, receivedAt: true });
export const insertActivityLogSchema = createInsertSchema(activityLogsTable).omit({ id: true, createdAt: true });

export type User = typeof usersTable.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Tenant = typeof tenantsTable.$inferSelect;
export type MetaCredential = typeof metaCredentialsTable.$inferSelect;
export type Post = typeof postsTable.$inferSelect;
export type AutomationRule = typeof automationRulesTable.$inferSelect;
export type Comment = typeof commentsTable.$inferSelect;
export type ActivityLog = typeof activityLogsTable.$inferSelect;
