# Architecture Source of Truth

## Purpose and constraints

This document is authoritative for this assessment implementation. It is deliberately constrained to the assessment: React with TypeScript; Node.js/Express with TypeScript; PostgreSQL with Prisma; WebSockets; node-cron; server-side validation; structured errors; JWT access and refresh tokens; and API-enforced authorization.

## Repository shape

```
apps/
  api/                 Express API, Socket.io, scheduler
  web/                 React + TypeScript application
packages/
  shared/              shared TypeScript contracts only when genuinely useful
docs/                  diagrams or supporting evidence, if needed
```

`apps/api` owns all database access. Controllers map HTTP to services; services coordinate policies, repositories, transactions, notifications, and realtime publishing; repositories own Prisma calls. The web application never receives database credentials or refresh-token values.

## Chosen technologies

| Concern | Decision | Reason tied to the assessment |
| --- | --- | --- |
| API | Express + TypeScript | Meets the allowed Node.js backend requirement with a conventional middleware model for authentication and policy enforcement. |
| Database | PostgreSQL + Prisma | Meets the relational/ORM requirement and makes foreign keys, indexes, migrations, and seeds explicit. |
| Realtime | Socket.io over WebSocket | Satisfies the WebSocket requirement while providing authenticated reconnects and named server-to-client events. |
| Overdue work | node-cron in the API process | Meets the scheduler requirement without adding a queue infrastructure not requested by the assessment. |
| Validation | Zod schemas at the API boundary | Ensures all external input is validated server-side. |
| Frontend | React + TypeScript | Required by the assessment. |

## Domain model

```
User (ADMIN | PROJECT_MANAGER | DEVELOPER)
  ├─ createdProjects -> Project.createdBy
  ├─ assignedTasks  -> Task.assignedDeveloper
  ├─ activity       -> ActivityLog.actor
  └─ notifications  -> Notification.recipient

Client -> Project -> Task -> ActivityLog
                           └-> Notification (when applicable)
```

### Data invariants

- A project belongs to one client and has one creator.
- A PM may manage only a project where `project.createdById === authenticatedUser.id`.
- A developer may read/update only a task where `task.assignedDeveloperId === authenticatedUser.id`; their permitted update is task status only.
- An activity log is inserted in the same database transaction as every status transition and stores actor, previous status, new status, and time.
- A task’s `isOverdue` flag is maintained by the scheduler. Its due date is not interpreted as a page-load side effect.
- Refresh sessions are persisted as hashed token identifiers and are revoked/rotated; plaintext refresh tokens are never stored in PostgreSQL.

## Authentication and session flow

1. `POST /auth/login` validates credentials and issues a short-lived signed access JWT in the JSON response.
2. The API creates a persisted refresh session and sends a signed refresh JWT in a `HttpOnly`, `Secure` (production), `SameSite` cookie. It is never written to localStorage.
3. The React application holds the access token only in memory and sends it in the `Authorization: Bearer` header.
4. `POST /auth/refresh` reads the cookie, verifies it and its persisted session, rotates the session/token, and returns a new access token.
5. `POST /auth/logout` revokes the current refresh session and clears the cookie.

The JWT contains user id, role, and session id. The database remains authoritative for resource ownership and session validity; no request is authorized from role claims alone.

## API authorization model

Every protected HTTP route follows this sequence: authenticate -> validate input -> load the relevant resource -> evaluate role plus ownership/assignment policy -> perform service operation. Socket connections use the same access-token verification and policy filtering before any event is emitted.

| Actor | Projects | Tasks | Activity |
| --- | --- | --- | --- |
| Admin | All | All | All projects |
| PM | Only projects created by that PM | Tasks within those projects; may create/assign/manage | Only those projects |
| Developer | No project-management access | Only assigned tasks; status update only | Only assigned tasks |

This table is enforced in services/policies, not derived from UI routes, URL parameters, or Socket.io room names.

## HTTP API conventions

- API prefix: `/api/v1`.
- Task list filters use query parameters: `status`, `priority`, `dueFrom`, and `dueTo`.
- List queries apply authorization predicates before filters, not after results are fetched.
- Mutating task status requests require a status value; services determine the previous value and write the immutable activity record.
- Success responses use an explicit data envelope. Errors have this shape and never include a stack trace:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "You are not permitted to access this resource",
    "details": []
  }
}
```

## Realtime, activity catchup, notifications, and presence

Socket.io events use a server-authenticated connection. A client cannot choose a room that grants access. After authentication, server-side delivery is selected from the same policies as the HTTP API.

1. A status update service runs one transaction: update task, create `ActivityLog`, and create any required notification.
2. After the transaction commits, the publisher emits the activity only to authorized active recipients: admins globally, the owning PM, and the assigned developer. No client-side filtering is relied on.
3. On reconnect, the client supplies its last received activity timestamp/cursor. The API/socket handler queries `ActivityLog` in PostgreSQL with the recipient's authorization predicate, orders oldest-first, and returns at most 20 events missed after that cursor. If no cursor exists, it returns the latest permitted 20 events.
4. Assignment creates a stored notification for the assigned developer. A move to `IN_REVIEW` creates a stored notification for the owning PM. The unread count and notification payload are pushed by WebSocket.
5. Presence is maintained as a connection count per authenticated user in the Socket.io process; duplicate tabs do not inflate the unique online-user count. Presence is ephemeral by nature and not a replacement for persisted activity/notifications.

## Background scheduler

`node-cron` runs a server-side overdue-task service on a fixed schedule. It finds unfinished tasks with due dates before the current time and sets `isOverdue`. The service is idempotent. The scheduler never runs in a browser and does not depend on a dashboard request.

## Environment and security baseline

- Secrets belong only in ignored `.env` files; `.env.example` lists names with safe placeholders.
- Required production settings include `DATABASE_URL`, access/refresh JWT secrets, allowed web origin, cookie settings, and API port.
- Passwords are salted and hashed; logs must not contain credentials or token values.
- CORS is allowlisted to the frontend origin and enables credentials only for that origin.
- Cookie `secure` is enabled in production and `sameSite` is selected to match the deployed same-site/cross-site topology.

## Deployment consideration

The frontend can deploy to Vercel. Persistent Socket.io connections and an in-process cron scheduler require a long-running Node runtime; Vercel serverless functions are not an appropriate host for that process. Before deployment, verify the required Vercel hosting expectation with the evaluator or deploy the React app on Vercel and the API/realtime/scheduler on a long-running Node host, then document the topology and limitation in the README. This does not change the required product behavior.

## Required verification

- API tests deny developer access to another developer’s task and all PM/admin-only data.
- API tests deny a PM access to a project created by another PM.
- Realtime tests assert both allowed event delivery and non-delivery to unauthorized recipients.
- Reconnect tests prove catchup is queried from PostgreSQL and capped at 20 events.
- Scheduler tests prove overdue marking runs outside a request.
- Seed validation proves the required 1 admin, 2 PMs, 4 developers, 3 projects, 15+ tasks, 2+ overdue tasks, and activity entries.
