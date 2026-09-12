# Velozity Assessment Submission Checklist

Status key: **PASS** = supported by repository evidence, **PENDING** = implemented or
documented but not yet verified for submission, **FAIL** = a known requirement is
not satisfied.

## Assessment requirements

| Requirement | Status | Evidence / remaining verification |
| --- | --- | --- |
| React + TypeScript frontend | PASS | `apps/web` uses React, Vite, and TypeScript. |
| Node.js + Express + TypeScript API | PASS | `apps/api` uses Express and strict TypeScript. |
| PostgreSQL + Prisma persistence | PASS | Prisma PostgreSQL schema, migration, and seed files exist. |
| Required domain models and relationships | PASS | User, Client, Project, Task, ActivityLog, Notification, and RefreshSession are defined with foreign keys and delete rules. |
| Prisma indexes | PASS | Role, ownership, task filters, overdue, notifications, sessions, and `(createdAt, id)` activity indexes exist. |
| Deterministic seed data | PASS | Seed creates 1 admin, 2 PMs, 4 developers, 3 projects, 15 tasks, overdue tasks, activity logs, and notifications. |
| Login and password verification | PASS | Bcrypt-backed login route and seeded demonstration accounts exist. |
| Short-lived access JWT | PASS | Access tokens include user, role, and session claims with a 15-minute expiry. |
| Refresh JWT lifecycle | PASS | HttpOnly cookie, persisted hashed session, rotation, revocation, and concurrent-rotation protection exist. |
| Authentication middleware | PASS | Bearer tokens are verified and matched to an active persisted session. |
| Role-level authorization | PASS | Role middleware and route restrictions exist, including protected user listing. |
| Object-level project authorization | PASS | PM ownership and admin project policies are enforced server-side. |
| Object-level task authorization | PASS | PM project ownership, developer assignment, and admin access are enforced server-side. |
| Developer status workflow | PASS | Developers can update status only through the dedicated assigned-task status route. |
| Client/project/task APIs | PASS | CRUD routes, service authorization, validation, and structured responses exist. |
| Server-side task filtering | PASS | Status, priority, due-date, and project filters are applied in API queries. |
| Audited status transitions | PASS | Transactional status update writes activity, notifications, and realtime activity. |
| Socket.io authentication | PASS | Handshake access-token verification includes active refresh-session validation. |
| WebSocket-only transport | PASS | Client and server explicitly configure `transports: ["websocket"]`. |
| Authorized realtime delivery | PASS | Admin, project-owner, and assigned-developer rooms are used for activity delivery. |
| PostgreSQL-backed activity catchup | PASS | Role-filtered database queries are capped at 20 and use the `(createdAt, id)` cursor. |
| Same-timestamp catchup correctness | PASS | Focused PostgreSQL test passed as part of the API suite. |
| Notifications and unread counts | PASS | Assignment and `IN_REVIEW` notifications, read APIs, and realtime count events exist. |
| Live presence | PASS | Unique connected-user tracking and admin presence events exist. |
| Overdue background job | PASS | In-process `node-cron` runs every minute and idempotently flags overdue tasks. |
| Structured API errors | PASS | App, validation, and unexpected errors return structured responses without stack traces. |
| Frontend auth and dashboards | PASS | In-memory access-token state, silent refresh, role dashboards, filters, activity, and notifications exist. |
| API and realtime tests | PASS | Workspace-aware API test run passed: 6 test files, 42 tests, 0 failed, 0 skipped. |
| Production deployment | PENDING | No deployment has been run or proven, and no live URL is claimed. |

## Auto-disqualification risk checks

- **PASS — Backend-enforced RBAC:** authorization is implemented in API middleware,
  policies, scoped queries, and resource checks; frontend controls are not the
  security boundary.
- **PASS — WebSocket-only transport:** both Socket.io endpoints reject polling
  fallback by configuration.
- **PASS — TypeScript:** API and web packages use TypeScript with strict API
  compiler settings; prior workspace typechecks passed.
- **PASS — Seed script:** `apps/api/prisma/seed.ts` creates the required users,
  projects, tasks, overdue records, logs, and notifications.
- **PASS — Refresh-token implementation:** refresh tokens are HttpOnly cookies,
  hashed in PostgreSQL, rotated, revoked, and checked for active sessions.
- **PASS — No hardcoded production secrets:** repository templates contain local
  development/test placeholders only; production secrets still must be supplied
  outside Git.
- **PASS — Structured errors:** API errors expose codes, messages, and details,
  while the fallback response omits stack traces.

## Cannot yet be claimed

PostgreSQL migrations and seed execution, deployment, TLS, production
configuration, a live URL, and the full workspace test suite have not been run or
verified in this audit. API integration and realtime behavior are verified by the
workspace-aware API test run: 6 test files passed, 42 tests passed, 0 failed, and
0 skipped. The in-process scheduler requires a continuously running API host and
is not a distributed job system.

## Submission explanation

The hardest technical problem was preserving authorization across both ordinary
HTTP requests and long-lived realtime connections. A signed JWT alone was not
enough: API requests and Socket.io handshakes also check the persisted refresh
session, while connected sockets monitor revocation and expiry. The role-filtered
realtime feed is backed by PostgreSQL rather than an in-memory event cache.
Admins query all activity, project managers query activity through projects they
created, and developers query activity through tasks assigned to them. Results
are capped at 20 and use a deterministic `(createdAt, id)` cursor so events
sharing a timestamp are neither skipped nor duplicated. Status changes are
handled through one audited transaction that updates the task, records an
activity log, creates required notifications, and publishes the authorized
event. With more time, I would add a production-grade distributed scheduler and
observability layer so overdue detection, Socket.io presence, and background
failures remain reliable across multiple API instances. I would also complete
deployment verification with managed PostgreSQL, TLS, secret management, and a
repeatable CI environment before presenting a live demonstration.

## Exact remaining user actions

1. Confirm the working tree contains no unintended files, then stage and commit
   all intended implementation files, including currently untracked API,
   frontend, Prisma migration, seed, test, and checklist files.
2. Before committing or deploying, replace any real or exposed credentials,
   JWT secrets, database URLs, and cookie settings with deployment-managed
   secrets; keep only fake local values in templates.
3. Start an isolated PostgreSQL test database, copy
   `apps/api/.env.test.example` to `.env.test`, set `DATABASE_URL` explicitly,
   and run migrations and seed for final clean-environment verification.
4. Run API and web typechecks, Prisma validation, and a production web build
   in the final clean checkout.
5. Manually verify admin, both PM boundaries, developer assignment boundaries,
   token refresh/logout, WebSocket-only connections, catchup pagination,
   notifications, presence, and overdue scheduling against PostgreSQL.
6. Push the reviewed commit to the remote repository.
7. Deploy the frontend to Vercel and the API plus PostgreSQL to a long-running
   Node-capable host, configure CORS/cookies/secrets, and verify the deployed
   flows before claiming a live URL.
