import { Role, Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { AuthUser } from "../policies/project.policy.js";

export class ActivityService {
  /**
   * Retrieves missed activity events strictly from PostgreSQL.
   * Enforces role-based predicates at the SQL/Prisma level.
   */
  async getCatchupEvents(
    user: AuthUser,
    since?: Date,
    lastId?: string,
    limit = 20,
  ) {
    const cappedLimit = Math.min(Math.max(1, limit), 20);

    const where: Prisma.ActivityLogWhereInput = {};

    // 1. Enforce Role & Ownership Predicate
    if (user.role === Role.PROJECT_MANAGER) {
      where.task = {
        project: {
          createdById: user.id,
        },
      };
    } else if (user.role === Role.DEVELOPER) {
      where.task = {
        assignedDeveloperId: user.id,
      };
    }
    // Admin has no task restriction

    // 2. Filter by timestamp/cursor if provided
    if (since && lastId) {
      where.OR = [
        { createdAt: { gt: since } },
        { createdAt: since, id: { gt: lastId } },
      ];
    } else if (since) {
      where.createdAt = {
        gt: since,
      };
    }

    // When catching up after a disconnect, return oldest-first up to 20 events.
    // If no 'since' cursor is provided, return the 20 most recent events.
    const orderBy: Prisma.ActivityLogOrderByWithRelationInput[] = since
      ? [{ createdAt: "asc" }, { id: "asc" }]
      : [{ createdAt: "desc" }, { id: "desc" }];

    const events = await prisma.activityLog.findMany({
      where,
      take: cappedLimit,
      orderBy,
      include: {
        task: {
          include: {
            project: {
              include: {
                client: true,
              },
            },
          },
        },
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // If fetched desc because no cursor, reverse so the client sees chronological progression
    if (!since) {
      return events.reverse();
    }

    return events;
  }
}

export const activityService = new ActivityService();
