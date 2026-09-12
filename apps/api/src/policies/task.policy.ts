import { Role, Task, Project } from "@prisma/client";
import { AuthUser } from "./project.policy.js";

export class TaskPolicy {
  static canView(
    user: AuthUser,
    task: Pick<Task, "assignedDeveloperId">,
    project: Pick<Project, "createdById">,
  ): boolean {
    if (user.role === Role.ADMIN) return true;
    if (user.role === Role.PROJECT_MANAGER) return project.createdById === user.id;
    if (user.role === Role.DEVELOPER) return task.assignedDeveloperId === user.id;
    return false;
  }

  static canCreate(user: AuthUser, project: Pick<Project, "createdById">): boolean {
    if (user.role === Role.ADMIN) return true;
    if (user.role === Role.PROJECT_MANAGER) return project.createdById === user.id;
    return false;
  }

  static canManage(
    user: AuthUser,
    _task: Pick<Task, "assignedDeveloperId">,
    project: Pick<Project, "createdById">,
  ): boolean {
    if (user.role === Role.ADMIN) return true;
    if (user.role === Role.PROJECT_MANAGER) return project.createdById === user.id;
    return false;
  }

  static canUpdateStatus(
    user: AuthUser,
    task: Pick<Task, "assignedDeveloperId">,
    project: Pick<Project, "createdById">,
  ): boolean {
    if (user.role === Role.ADMIN) return true;
    if (user.role === Role.PROJECT_MANAGER) return project.createdById === user.id;
    if (user.role === Role.DEVELOPER) return task.assignedDeveloperId === user.id;
    return false;
  }
}
