# Velozity Client Project Dashboard

Implementation of the Velozity Global Solutions Full Stack Developer technical assessment.

The initial foundation intentionally contains the architecture, workspace layout, and Prisma domain schema only. Feature implementation follows the milestones in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). [ARCHITECTURE.md](ARCHITECTURE.md) is the source of truth for security, persistence, realtime delivery, and deployment decisions.

## Current status

- [x] Architecture and implementation plan
- [x] TypeScript workspace and environment templates
- [x] PostgreSQL/Prisma schema
- [ ] Migrations and seed data
- [ ] Authentication and API authorization
- [ ] Project/task APIs, realtime, notifications, scheduler, React UI, tests, deployment

## Local setup (foundation)

1. Install Node.js 20+ and PostgreSQL.
2. Copy `apps/api/.env.example` to `apps/api/.env` and provide local secrets/database credentials.
3. Copy `apps/web/.env.example` to `apps/web/.env`.
4. Install workspace dependencies with `npm install`.
5. Once the data milestone is implemented, run Prisma generation, migration, and seed commands from `apps/api`.

No real credentials or deployment URLs are included in the repository.
