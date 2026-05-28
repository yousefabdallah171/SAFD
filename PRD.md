# Social Auto Funnel Dashboard (SAFD) — Product Requirements Document

**Version:** 1.0  
**Date:** May 2, 2026  
**Status:** MVP Complete — Core Automation Engine Pending

---

## 1. Product Overview

SAFD is a multi-tenant SaaS platform that automates Facebook and Instagram comment replies and DM follow-ups using the official Meta Graph API. Social media managers define keyword-based automation rules; when a matching comment arrives, the platform instantly sends a public reply and optionally a private DM — 24/7, without manual intervention.

### Target Users
- Social media managers at SMBs
- Influencers and content creators
- Digital marketing agencies managing multiple client accounts

### Core Value Proposition
- Save 5+ hours per day on manual comment replies
- Achieve 100% comment response rate automatically
- Convert engaged commenters into leads via DM funnels
- Built on official Meta APIs — no scraping, no account bans

---

## 2. Architecture

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 7, TypeScript, TailwindCSS v4 |
| Routing | Wouter |
| State | Zustand |
| Data fetching | TanStack React Query |
| Forms | react-hook-form + Zod |
| Charts | Recharts |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL via Drizzle ORM |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| API Design | OpenAPI 3.0 contract-first (Orval codegen) |

### Infrastructure Layout

```
artifacts/
  api-server/     → Express REST API (port 8080, path /api)
  safd/           → React+Vite frontend (port variable, path /)
lib/
  db/             → Drizzle schema + migrations
  api-spec/       → OpenAPI YAML + codegen scripts
  api-client-react/ → Generated React Query hooks
  api-zod/        → Generated Zod validation schemas
```

### Multi-tenancy Model
- Each user registration creates one **User** + one **Tenant**
- All data (posts, rules, comments, logs) is scoped by `tenant_id`
- JWT payload carries `{ userId, tenantId, email }`

---

## 3. Database Schema

### users
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| email | varchar(255) | unique |
| password | text | bcrypt hashed |
| name | text | |
| email_verified | boolean | default true (MVP) |
| created_at | timestamp | |

### tenants
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| user_id | int FK | references users |
| name | text | e.g. "Jane's Workspace" |
| created_at | timestamp | |

### meta_credentials
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| tenant_id | int FK | |
| app_id | varchar | Meta App ID |
| app_secret | text | Meta App Secret (encrypted at rest — TODO) |
| access_token | text | User/Page access token |
| platform | varchar | facebook / instagram / both |
| status | varchar | active / expired / invalid |
| connected_at | timestamp | |

### posts
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| tenant_id | int FK | |
| meta_id | varchar(255) | Meta Graph object ID |
| platform | varchar | facebook / instagram |
| type | varchar | post / reel |
| caption | text | |
| thumbnail_url | text | |
| permalink | text | |
| comment_count | int | |
| like_count | int | |
| automation_enabled | boolean | |
| published_at | timestamp | |
| synced_at | timestamp | last Meta sync |

### automation_rules
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| tenant_id | int FK | |
| post_id | int FK nullable | null = global rule |
| is_global | boolean | applies to all posts |
| name | text | human-readable label |
| keywords | jsonb | string array of trigger words |
| reply_text | text | public comment reply |
| dm_message | text nullable | private DM content |
| send_dm | boolean | whether to send DM |
| is_enabled | boolean | |
| match_count | int | total keyword matches |
| reply_count | int | successful replies sent |
| dm_count | int | successful DMs sent |
| created_at | timestamp | |
| updated_at | timestamp | |

### comments
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| tenant_id | int FK | |
| post_id | int FK | |
| meta_comment_id | varchar | Meta Graph comment ID |
| author_name | text | |
| author_id | varchar | Meta user ID |
| text | text | comment content |
| status | varchar | pending / replied / dm_sent / failed |
| replied_at | timestamp nullable | |
| dm_sent_at | timestamp nullable | |
| matched_rule_id | int FK nullable | |
| received_at | timestamp | |

### activity_logs
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| tenant_id | int FK | |
| type | varchar | comment_received / reply_sent / dm_sent / rule_matched / error |
| post_id | int FK nullable | |
| comment_id | int FK nullable | |
| rule_id | int FK nullable | |
| message | text | human-readable event description |
| metadata | jsonb nullable | extra structured data |
| created_at | timestamp | |

---

## 4. API Endpoints

All endpoints are prefixed with `/api`. Protected endpoints require `Authorization: Bearer <token>`.

### Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | No | Create account + tenant, returns JWT |
| POST | /auth/login | No | Authenticate, returns JWT |
| POST | /auth/logout | No | Server-side logout (stateless — client clears token) |
| GET | /auth/me | Yes | Get current user profile |

### Meta Credentials
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /meta-credentials | Yes | List connected Meta accounts |
| POST | /meta-credentials | Yes | Add new Meta API credential |
| DELETE | /meta-credentials/:id | Yes | Remove credential |

### Posts
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /posts | Yes | List posts (page, limit, search, type, platform) |
| GET | /posts/:id | Yes | Get single post with rules count |
| POST | /posts/sync | Yes | Trigger Meta API sync |

### Automation Rules
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /rules | Yes | List rules (filter: postId, isGlobal) |
| POST | /rules | Yes | Create rule |
| GET | /rules/:id | Yes | Get rule |
| PUT | /rules/:id | Yes | Update rule |
| DELETE | /rules/:id | Yes | Delete rule |
| POST | /rules/:id/toggle | Yes | Toggle enabled/disabled |

### Comments
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /comments | Yes | List comments (postId, status, page, limit) |

### Activity Logs
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /activity-logs | Yes | List logs (type, page, limit) |

### Analytics
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /analytics/summary | Yes | KPI summary (totalComments, totalReplies, totalDms, replyRate, dmDeliveryRate, activeRules, avgResponseTimeSeconds) |
| GET | /analytics/engagement | Yes | Per-day metrics (days param, default 30) |
| GET | /analytics/top-posts | Yes | Top posts by comment count |
| GET | /analytics/recent-activity | Yes | Recent activity logs |
| GET | /analytics/rule-performance | Yes | Per-rule stats (matchCount, replyCount, successRate) |

---

## 5. Frontend Pages

### Public Pages (unauthenticated)
| Route | Page | Description |
|-------|------|-------------|
| / | Landing | Hero, features, stats, how-it-works, pricing placeholder, CTA |
| /login | Login | Email + password form, JWT stored in localStorage |
| /register | Register | Name + email + password, redirects to /onboarding |

### Protected Pages (require JWT)
| Route | Page | Description |
|-------|------|-------------|
| /onboarding | Onboarding Wizard | 5 steps: Welcome → Connect Meta → Sync posts → Create rule → Dashboard |
| /dashboard | Dashboard | 6 KPI cards, 30-day engagement chart, recent activity feed, top posts table |
| /posts | Posts List | Paginated, searchable, filterable by platform/type |
| /posts/:id | Post Detail | Post info, its automation rules, recent comments |
| /rules | Rules List | All rules with enable/disable switch, keyword badges, stats |
| /rules/new | Create Rule | Keyword builder, reply text, DM message, global toggle |
| /rules/:id/edit | Edit Rule | Pre-filled form with existing rule data |
| /comments | Comments Feed | Paginated feed filtered by status (pending/replied/dm_sent/failed) |
| /activity | Activity Log | Real-time-style event feed filterable by event type |
| /analytics | Analytics | Full KPI grid, 30-day line chart, top posts, rule performance table |
| /settings | Settings | Tabs: Profile, Meta API Credentials (connect/disconnect), Billing |

---

## 6. Auth Flow

```
Register → POST /api/auth/register
         → Returns { token, user }
         → token stored in localStorage as "safd_token"
         → Redirect to /onboarding

Login    → POST /api/auth/login
         → Returns { token, user }
         → token stored in localStorage as "safd_token"
         → Redirect to /dashboard

Every API call → Authorization: Bearer <token> (via setAuthTokenGetter in api-setup.ts)

ProtectedRoute → reads token from Zustand (useAuthStore)
              → if no token → <Redirect to="/login" />

Logout   → POST /api/auth/logout
         → localStorage.removeItem("safd_token")
         → Redirect to /
```

---

## 7. What Is Complete (MVP)

- [x] Full user registration and login with JWT
- [x] Multi-tenant architecture (each user gets their own workspace)
- [x] Landing / marketing page
- [x] 5-step onboarding wizard
- [x] Dashboard with KPI cards and engagement chart
- [x] Posts list and post detail view
- [x] Automation rule CRUD (create, read, update, delete, toggle)
- [x] Global rules and per-post rules
- [x] Comments feed with status filtering
- [x] Activity log feed with event type filtering
- [x] Full analytics page (charts, top posts, rule performance)
- [x] Settings: profile, Meta API credentials (add/remove), billing placeholder
- [x] All API endpoints implemented and tested
- [x] Seed data for demo purposes
- [x] Dark blue/indigo design system throughout

---

## 8. What Is NOT Yet Implemented (Production Gaps)

These features are required before the product can handle real automation:

### Critical — Core Automation Engine
- [ ] **Meta Webhooks listener** — subscribe to `comments` webhook events from Meta Graph API so the platform receives real-time notifications when new comments are posted
- [ ] **Comment reply engine** — when webhook fires, evaluate all applicable rules (global + post-specific), find first keyword match, call Meta Graph API `POST /{comment-id}/replies` to post the auto-reply
- [ ] **DM send engine** — after successful reply, if `sendDm: true`, call Meta Graph API to send a direct message to the commenter's user ID
- [ ] **Posts sync engine** — implement `POST /posts/sync` to actually call Meta Graph API (`GET /me/posts`, `GET /me/media` for Instagram) and upsert posts into the database
- [ ] **Token refresh** — implement long-lived token exchange and automatic refresh before expiry

### Security
- [ ] **Encrypt credentials at rest** — `appSecret` and `accessToken` in `meta_credentials` table should be AES-256 encrypted before storing in the database (use `NODE_ENV` + a `ENCRYPTION_KEY` secret)
- [ ] **Webhook signature verification** — validate `X-Hub-Signature-256` header on all incoming Meta webhook calls
- [ ] **Rate limiting** — add rate limiting middleware to auth endpoints to prevent brute force

### Accounts & Billing
- [ ] **Email verification** — send verification email on register, block dashboard access until verified
- [ ] **Password reset** — forgot password flow with email link
- [ ] **Stripe integration** — billing plans (free tier: 1 account, N rules; paid: unlimited)
- [ ] **Usage limits** — enforce plan limits on number of connected accounts, rules, monthly replies

### Operational
- [ ] **Job queue** — use a queue (BullMQ/pg-boss) for reliable async processing of comment events so spikes don't drop requests
- [ ] **Error retry** — automatic retry with exponential backoff for failed Meta API calls, updating comment status to `failed` after N retries
- [ ] **Admin dashboard** — internal view for monitoring tenants, usage, errors
- [ ] **Alerts** — notify users when credentials expire or automation encounters repeated errors

---

## 9. Environment Variables Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | JWT signing secret (min 32 chars in production) |
| `ENCRYPTION_KEY` | AES-256 key for encrypting Meta credentials at rest (TODO) |
| `META_APP_ID` | Platform-level Meta App ID for webhook verification |
| `META_APP_SECRET` | Platform-level Meta App Secret for webhook verification |
| `PORT` | HTTP port (set automatically by Replit per workflow) |

---

## 10. Codegen Workflow

The API contract is defined in `lib/api-spec/openapi.yaml`. After any change to the spec:

```bash
pnpm --filter @workspace/api-spec run codegen
```

This generates:
- `lib/api-client-react/src/generated/api.ts` — React Query hooks (useListPosts, useCreateRule, etc.)
- `lib/api-zod/src/generated/api.ts` — Zod validation schemas (RegisterBody, CreateRuleBody, etc.)

The backend routes import Zod schemas from `@workspace/api-zod` for request validation.

---

## 11. Design System

- **Background:** `hsl(230, 25%, 10%)` — deep navy
- **Primary:** `hsl(240, 100%, 65%)` — electric indigo
- **Card:** `hsl(230, 25%, 12%)` — slightly lighter navy
- **Sidebar:** `hsl(230, 25%, 8%)` — darkest navy
- **Font:** System sans-serif stack
- **Radii:** Consistent rounded-xl cards, rounded-md inputs
- **Vibe:** Dense, professional command dashboard — every pixel earns its place

---

## 12. Next Steps (Priority Order)

1. **Meta Webhooks** — set up the `/api/webhooks/meta` endpoint for comment events
2. **Comment reply engine** — evaluate rules and fire Graph API replies in response
3. **Posts sync** — real Meta Graph API call in the sync endpoint
4. **Credential encryption** — AES-256 encrypt secrets before DB storage
5. **Email verification + password reset**
6. **Stripe billing**
7. **Job queue for reliability**
8. **Deploy to production** (Replit Deployments → custom domain)
