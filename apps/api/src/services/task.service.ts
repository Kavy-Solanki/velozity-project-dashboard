import { Role, TaskStatus, Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { AppError } from "../errors/AppError.js";
import { AuthUser } from "../policies/project.policy.js";
import { TaskPolicy } from "../policies/task.policy.js";
import {
  CreateTaskInput,
  UpdateTaskInput,
  ListTasksQuery,
} from "../validation/task.schema.js";
import { RealtimePublisher, ActivityPayload } from "../realtime/realtimePublisher.js";
import { notificationService } from "./notification.service.js";

export class TaskService {
  async listTasks(user: AuthUser, query: ListTasksQuery) {
    const where: Prisma.TaskWhereInput = {};

    // 1. Enforce Role-Based Scoping at Database Query Level
    if (user.role === Role.PROJECT_MANAGER) {
      where.project = {
        createdById: user.id,
      };
    } else if (user.role === Role.DEVELOPER) {
      where.assignedDeveloperId = user.id;
    }
    // Admin has no creator/assignment restriction

    // 2. Query Parameter Server-Side Filtering
    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.projectId) {
      where.projectId = query.projectId;
    }

    if (query.dueFrom || query.dueTo) {
      where.dueDate = {};
      if (query.dueFrom) {
        where.dueDate.gte = new Date(query.dueFrom);
      }
      if (query.dueTo) {
        where.dueDate.lte = new Date(query.dueTo);
      }
    }

    return prisma.task.findMany({
      where,
      include: {
        project: {
          include: {
            client: true,
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        assignedDeveloper: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    });
  }

  async getTaskById(user: AuthUser, taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            client: true,
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        assignedDeveloper: {
          select: { id: true, name: true, email: true, role: true },
        },
        activityLogs: {
          include: {
            actor: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!task) {
      throw AppError.notFound("Task not found");
    }

    if (!TaskPolicy.canView(user, task, task.project)) {
      throw AppError.forbidden("You do not have permission to view this task");
    }

    return task;
  }

  async createTask(user: AuthUser, input: CreateTaskInput) {
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
    });

    if (!project) {
      throw AppError.badRequest("Specified project does not exist");
    }

    if (!TaskPolicy.canCreate(user, project)) {
      throw AppError.forbidden("You do not have permission to add tasks to this project");
    }

    if (input.assignedDeveloperId) {
      const dev = await prisma.user.findUnique({
        where: { id: input.assignedDeveloperId },
      });
      if (!dev || dev.role !== Role.DEVELOPER) {
        throw AppError.badRequest("Assigned user must be an active Developer");
      }
    }

    const dueDate = new Date(input.dueDate);
    const isOverdue = dueDate < new Date() && input.status !== TaskStatus.DONE;

    const task = await prisma.task.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        description: input.description,
        assignedDeveloperId: input.assignedDeveloperId,
        status: input.status,
        priority: input.priority,
        dueDate,
        isOverdue,
      },
      include: {
        project: {
          include: { client: true },
        },
        assignedDeveloper: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Notify assigned developer if applicable
    if (task.assignedDeveloperId) {
      const notification = await prisma.notification.create({
        data: {
          recipientId: task.assignedDeveloperId,
          taskId: task.id,
          message: `You were assigned to task '${task.title}' in project '${task.project.name}'`,
        },
      });

      const unreadCount = await notificationService.getUnreadCount({
        id: task.assignedDeveloperId,
      } as any);

      RealtimePublisher.publishNotification(notification);
      RealtimePublisher.publishUnreadCount(task.assignedDeveloperId, unreadCount);
    }

    return task;
  }

  async updateTask(user: AuthUser, taskId: string, input: UpdateTaskInput) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      throw AppError.notFound("Task not found");
    }

    if (!TaskPolicy.canManage(user, task, task.project)) {
      throw AppError.forbidden("You do not have permission to manage this task");
    }

    const previousDevId = task.assignedDeveloperId;
    const dueDate = input.dueDate ? new Date(input.dueDate) : task.dueDate;

    if (input.assignedDeveloperId) {
      const dev = await prisma.user.findUnique({
        where: { id: input.assignedDeveloperId },
        select: { role: true },
      });
      if (!dev || dev.role !== Role.DEVELOPER) {
        throw AppError.badRequest("Assigned user must be an active Developer");
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: input.title,
        description: input.description,
        assignedDeveloperId: input.assignedDeveloperId,
        priority: input.priority,
        dueDate: input.dueDate ? dueDate : undefined,
      },
      include: {
        project: {
          include: { client: true },
        },
        assignedDeveloper: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Notify newly assigned developer
    if (
      updatedTask.assignedDeveloperId &&
      updatedTask.assignedDeveloperId !== previousDevId
    ) {
      const notification = await prisma.notification.create({
        data: {
          recipientId: updatedTask.assignedDeveloperId,
          taskId: updatedTask.id,
          message: `You were assigned to task '${updatedTask.title}' in project '${updatedTask.project.name}'`,
        },
      });

      const unreadCount = await notificationService.getUnreadCount({
        id: updatedTask.assignedDeveloperId,
      } as any);

      RealtimePublisher.publishNotification(notification);
      RealtimePublisher.publishUnreadCount(updatedTask.assignedDeveloperId, unreadCount);
    }

    return updatedTask;
  }

  async updateTaskStatus(user: AuthUser, taskId: string, newStatus: TaskStatus) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        project: {
          include: {
            client: true,
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        assignedDeveloper: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!task) {
      throw AppError.notFound("Task not found");
    }

    if (!TaskPolicy.canUpdateStatus(user, task, task.project)) {
      throw AppError.forbidden("You do not have permission to update the status of this task");
    }

    const fromStatus = task.status;
    if (fromStatus === newStatus) {
      return task;
    }

    // Interactive transaction:
    // 1. Update task status and isOverdue flag
    // 2. Create ActivityLog
    // 3. Create Notification if status changed to IN_REVIEW
    const isOverdue =
      newStatus === TaskStatus.DONE ? false : task.dueDate < new Date();

    const { updatedTask, activityLog, notification } = await prisma.$transaction(
      async (tx) => {
        const uTask = await tx.task.update({
          where: { id: taskId },
          data: {
            status: newStatus,
            isOverdue,
          },
          include: {
            project: {
              include: { client: true },
            },
            assignedDeveloper: {
              select: { id: true, name: true, email: true },
            },
          },
        });

        const actLog = await tx.activityLog.create({
          data: {
            taskId: uTask.id,
            actorId: user.id,
            fromStatus,
            toStatus: newStatus,
          },
          include: {
            actor: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        });

        let notif = null;
        // Scenario 2: Task moves to In Review -> PM notification
        if (newStatus === TaskStatus.IN_REVIEW) {
          const owningPmId = task.project.createdById;
          notif = await tx.notification.create({
            data: {
              recipientId: owningPmId,
              taskId: uTask.id,
              message: `Task '${uTask.title}' moved to In Review by ${user.name}`,
            },
          });
        }

        return { updatedTask: uTask, activityLog: actLog, notification: notif };
      },
    );

    // After transaction commits: dispatch realtime notifications & activity
    const activityPayload: ActivityPayload = {
      ...activityLog,
      task: updatedTask,
    };

    RealtimePublisher.publishActivity(activityPayload);

    if (notification) {
      const unreadCount = await notificationService.getUnreadCount({
        id: notification.recipientId,
      } as any);

      RealtimePublisher.publishNotification(notification);
      RealtimePublisher.publishUnreadCount(notification.recipientId, unreadCount);
    }

    return updatedTask;
  }

  async deleteTask(user: AuthUser, taskId: string) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true },
    });

    if (!task) {
      throw AppError.notFound("Task not found");
    }

    if (!TaskPolicy.canManage(user, task, task.project)) {
      throw AppError.forbidden("You do not have permission to delete this task");
    }

    await prisma.task.delete({
      where: { id: taskId },
    });

    return { success: true };
  }
}

export const taskService = new TaskService();
