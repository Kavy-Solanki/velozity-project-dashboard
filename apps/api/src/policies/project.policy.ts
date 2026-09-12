import { Role, Project, User } from "@prisma/client";

export type AuthUser = Pick<User, "id" | "email" | "role" | "name">;

export class ProjectPolicy {
  static canView(user: AuthUser, project: Pick<Project, "createdById">): boolean {
    if (user.role === Role.ADMIN) return true;
    if (user.role === Role.PROJECT_MANAGER) return project.createdById === user.id;
    return false;
  }

  static canCreate(user: AuthUser): boolean {
    return user.role === Role.ADMIN || user.role === Role.PROJECT_MANAGER;
  }

  static canManage(user: AuthUser, project: Pick<Project, "createdById">): boolean {
    if (user.role === Role.ADMIN) return true;
    if (user.role === Role.PROJECT_MANAGER) return project.createdById === user.id;
    return false;
  }
}
