# Implementation Plan

## Source and scope

This plan implements only the requirements in **Velozity Global Solutions - Full Stack Developer - Technical Hiring Assessment**. `ARCHITECTURE.md` is the technical source of truth. A change to either document must be deliberate and reviewed before implementation changes rely on it.

## Rubric-first delivery order

| Milestone | Deliverable | Evidence of completion |
| --- | --- | --- |
| 0. Foundation | TypeScript workspaces, environment templates, shared conventions, PostgreSQL/Prisma schema | Type-checking and Prisma validation succeed; no secret is committed |
| 1. Data and seed | Migration and deterministic seed data | Required roles, projects, tasks, overdue tasks, and activity data exist |
| 2. Authentication | Login, short-lived access JWT, refresh endpoint, refresh-token rotation/revocation | Refresh token is HttpOnly and API routes reject unauthenticated calls |
| 3. API authorization | Role middleware and object-level policies across every protected endpoint | Security tests prove cross-user, cross-PM, and developer-to-PM access is denied |
| 4. Projects and tasks | Project/task APIs, server validation, query-parameter filters, persisted status activity | API tests cover valid operations and structured error responses |
| 5. Real time | Authenticated Socket.io connection, role-filtered live activity, DB-backed 20-event catchup | Multi-user integration tests prove permitted delivery and prohibited non-delivery |
| 6. Notifications and presence | Stored notifications, real-time unread badge updates, live presence count | Notification/presence tests pass without polling |
| 7. Dashboard and UI | React role dashboards and shareable task filters | Manual role walk-through against seeded accounts |
| 8. Operations and handoff | Overdue scheduler, Docker/local instructions, deployment notes, 150-250 word explanation | Clean-clone setup and rubric checklist pass |

## Rules that block a milestone

- Do not rely on hidden UI for authorization; tests must exercise the API directly.
- Do not replace WebSockets with polling, long polling, or SSE.
- Do not expose a raw stack trace or hardcode a secret.
- Do not skip the refresh-token flow, Prisma seed script, or TypeScript.
- Do not place database queries directly in route controllers; route, service, policy, repository, and realtime responsibilities stay separate.

## Definition of done for the final submission

The repository has a repeatable local setup, PostgreSQL schema/migrations/seed script, all required UI and APIs, a live deployment link, README architectural justifications and limitations, security/realtime tests, and the required 150-250 word explanation.
