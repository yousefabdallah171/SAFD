# Social Auto Funnel Dashboard (SAFD)

A multi-tenant SaaS platform that automates Facebook/Instagram comment replies and DM follow-ups using official Meta APIs.

## Architecture

- **Frontend**: React + Vite (`artifacts/safd`) — served at `/`
- **API**: Express + TypeScript (`artifacts/api-server`) — served at `/api`
- **Database**: PostgreSQL via Drizzle ORM (`lib/db`)
- **API contract**: OpenAPI spec in `lib/api-spec`, codegen in `lib/api-client-react` (React Query hooks) and `lib/api-zod` (Zod schemas)

## Workflows

- `artifacts/api-server: API Server` — Express API on port 8080
- `artifacts/safd: web` — Vite dev server for the React frontend

## Key Libraries

- Auth: JWT (jsonwebtoken) + bcryptjs, token stored in localStorage as `safd_token`
- State: Zustand (`useAuthStore` in `artifacts/safd/src/hooks/use-auth.ts`)
- Routing: Wouter
- Forms: react-hook-form + @hookform/resolvers + zod
- Charts: Recharts
- Icons: lucide-react + react-icons/si (SiFacebook, SiInstagram)

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register new user + create tenant |
| POST | /api/auth/login | Login, returns JWT |
| POST | /api/auth/logout | Logout (clears server-side if needed) |
| GET | /api/auth/me | Get current user |
| GET | /api/meta-credentials | List Meta API credentials |
| POST | /api/meta-credentials | Add credential |
| DELETE | /api/meta-credentials/:id | Remove credential |
| GET | /api/posts | List posts (paginated, searchable) |
| GET | /api/posts/:id | Get single post |
| POST | /api/posts/sync | Trigger Meta sync |
| GET | /api/rules | List automation rules |
| POST | /api/rules | Create rule |
| GET | /api/rules/:id | Get rule |
| PUT | /api/rules/:id | Update rule |
| DELETE | /api/rules/:id | Delete rule |
| POST | /api/rules/:id/toggle | Toggle rule on/off |
| GET | /api/comments | List comments (paginated, filterable) |
| GET | /api/activity-logs | List activity logs |
| GET | /api/analytics/summary | KPI summary stats |
| GET | /api/analytics/engagement | Per-day engagement (30 days) |
| GET | /api/analytics/top-posts | Top posts by comments |
| GET | /api/analytics/recent-activity | Recent activity feed |
| GET | /api/analytics/rule-performance | Rule performance stats |

## Frontend Pages

- `/` — Landing/marketing page
- `/login` — Login form
- `/register` — Registration form
- `/onboarding` — 5-step onboarding wizard (new users)
- `/dashboard` — KPI cards, engagement chart, activity feed, top posts
- `/posts` — Posts list (paginated, searchable, filterable)
- `/posts/:id` — Post detail with rules and comments
- `/rules` — All automation rules with enable/disable toggle
- `/rules/new` — Create rule form
- `/rules/:id/edit` — Edit rule form
- `/comments` — Comments feed filterable by status
- `/activity` — Activity log feed
- `/analytics` — Full analytics with charts and rule performance
- `/settings` — Profile, Meta API credentials, Billing (placeholder)

## Database Schema (`lib/db/src/schema/safd.ts`)

- `users` — id, email, password, name, emailVerified, createdAt
- `tenants` — id, userId, name, createdAt
- `meta_credentials` — id, tenantId, appId, appSecret, accessToken, platform, status, connectedAt
- `posts` — id, tenantId, metaId, platform, type, caption, thumbnailUrl, permalink, commentCount, likeCount, automationEnabled, publishedAt, syncedAt
- `automation_rules` — id, tenantId, postId, isGlobal, name, keywords (JSONB), replyText, dmMessage, sendDm, isEnabled, matchCount, replyCount, dmCount, createdAt, updatedAt
- `comments` — id, tenantId, postId, metaCommentId, authorName, authorId, text, status, repliedAt, dmSentAt, matchedRuleId, receivedAt
- `activity_logs` — id, tenantId, type, postId, commentId, ruleId, message, metadata, createdAt

## Codegen

To regenerate API client hooks and Zod schemas:
```bash
pnpm --filter @workspace/api-spec run codegen
```

Note: `lib/api-zod/src/index.ts` is overwritten by codegen — must only export from `./generated/api`.

## Auth Flow

1. User registers → backend creates user + tenant, returns JWT
2. Token stored in localStorage as `safd_token`
3. `useAuthStore` (Zustand) reads token from localStorage on init
4. `setAuthTokenGetter` in `lib/api-setup.ts` attaches Bearer token to all API calls
5. `ProtectedRoute` component redirects to `/login` if no token
6. New registrations redirect to `/onboarding` wizard

## Design

- Dark blue/indigo palette (`--background: 230 25% 10%`, `--primary: 240 100% 65%`)
- Dense, information-rich dashboard aesthetic
- All UI components in `artifacts/safd/src/components/ui/`
