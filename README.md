# Velozity Client Project Dashboard

A full-stack client project dashboard for the Velozity Global Solutions technical
assessment. The application provides role-specific project and task management,
audited task status changes, live activity, notifications, presence, and automated
overdue-task detection.

## Technology stack

- React 18, TypeScript, and Vite for the browser application
- Node.js 20+, Express, and TypeScript for the API
- PostgreSQL with Prisma ORM and migrations
- Socket.io for authenticated realtime activity, notifications, and presence
- `node-cron` for the server-side overdue-task scheduler
- Vitest and Supertest for API tests

## Repository layout

```text
apps/
  api/
    prisma/       Prisma schema, migrations, and deterministic seed
    src/          Express routes, services, policies, realtime, and scheduler
    tests/        API, authorization, realtime, catchup, and scheduler tests
  web/
    src/          React application, role dashboards, auth, and Socket.io client
ARCHITECTURE.md  Architectural source of truth
IMPLEMENTATION_PLAN.md
docker-compose.yml
```

## Local setup

Install Node.js 20 or newer and workspace dependencies:

```powershell
npm install
```

Configure the API and web environments without committing local secrets:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
```

Set a local PostgreSQL `DATABASE_URL` and development JWT secrets in
`apps/api/.env`. Start the API and web applications from the repository root:

```powershell
npm run dev:api
npm run dev:web
```

## PostgreSQL migrations and seed

With PostgreSQL running and `apps/api/.env` configured:

```powershell
Set-Location apps/api
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
Set-Location ../..
```

The seed resets the development data and creates clients, projects, tasks,
activity logs, and notifications deterministically.

## Seeded demonstration accounts

The seed script creates these accounts. Every account uses the password
`Password123!`:

| Role | Email |
| --- | --- |
| Admin | `admin@velozity.com` |
| Project Manager | `pm1@velozity.com` |
| Project Manager | `pm2@velozity.com` |
| Developer | `dev1@velozity.com` |
| Developer | `dev2@velozity.com` |
| Developer | `dev3@velozity.com` |
| Developer | `dev4@velozity.com` |

## Authentication and authorization

Login returns a short-lived access JWT, which the frontend keeps in memory.
Refresh and logout use a refresh token in an HttpOnly cookie; refresh sessions
are persisted and rotated so an old refresh token cannot be reused.

Authorization is enforced in the API, both at route scope and object scope:

- Admins can view and manage all projects and tasks.
- Project managers can view and manage only projects they created and their
  project tasks.
- Developers cannot access project management data; they can view and update
  status only on tasks assigned to them.
- Task status changes use the dedicated audited status-transition path, which
  records activity and creates required notifications.

## Realtime delivery

Socket.io authenticates connections with the access token and uses **WebSocket-only
transport**; polling fallback is intentionally disabled. Authorized users join
personal, project, or admin-global rooms. Activity, notification, unread-count,
and presence events are delivered only to authorized recipients.

## Database schema and indexes

Prisma models cover `User`, `Client`, `Project`, `Task`, `ActivityLog`,
`Notification`, and `RefreshSession`, with foreign keys, delete rules, and
role/status/priority enums. Indexes support project ownership and client lookup,
task project/assignment/status/priority/due-date filters, overdue detection,
notification queries, refresh-session expiry, and activity retrieval. Activity
catchup uses the compound `(createdAt, id)` index for deterministic cursor scans.

## Activity catchup

Activity catchup is queried directly from PostgreSQL and is filtered before
results are returned:

- Admins receive all activity.
- Project managers receive activity for tasks in projects they created.
- Developers receive activity for tasks assigned to them.

Results are ordered by `createdAt ASC, id ASC` after a cursor, capped at 20
events, and use the `(createdAt, id)` cursor pair so events sharing a timestamp
are not skipped or duplicated. Without a cursor, the most recent authorized
events are returned in chronological display order.

## Notifications, presence, and overdue scheduler

Task assignment and transitions to `IN_REVIEW` create database notifications.
Users can list notifications, mark one or all as read, and retrieve unread
counts; notification and count changes are also emitted over Socket.io.
Presence tracks unique connected users and publishes the online count to admins.

The API starts a `node-cron` job every minute. It marks past-due, non-`DONE`
tasks as overdue with an idempotent PostgreSQL update, independently of page
loads or API requests.

## API tests and test database

API tests require a reachable PostgreSQL database and an `apps/api/.env.test`
file. The repository includes a PostgreSQL 16 Docker Compose service and a test
environment template. From the repository root:

```powershell
docker compose up -d postgres
Set-Location apps/api
Copy-Item .env.test.example .env.test
$env:DATABASE_URL = ((Get-Content .env.test | Select-String '^DATABASE_URL=').Line -replace '^DATABASE_URL=', '')
npx prisma migrate deploy
npx prisma db seed
Set-Location ../..
npm test --workspace=@velozity/api
```

The `$env:DATABASE_URL` assignment ensures Prisma uses the test database URL
instead of an unrelated repository-root `.env` connection string. Tests run
sequentially against the shared PostgreSQL test database; Docker is optional if
an equivalent local PostgreSQL instance is available.

## Deployment

The frontend builds as a static SPA suitable for Vercel. The API cannot be
hosted as a short-lived serverless function because Socket.io connections and
the in-process `node-cron` scheduler require a long-running Node.js host with
network access to PostgreSQL.

## Known limitations

- A PostgreSQL instance is required for migrations, seed execution, and API
  integration/realtime tests; this repository does not provide a hosted database
  or live deployment URL.
- The overdue scheduler is in-process and therefore requires at least one
  continuously running API instance; it is not a distributed job queue.
- Production secrets, TLS termination, database provisioning, monitoring, and
  horizontal-scaling infrastructure are deployment responsibilities rather than
  included application services.
