import { Role } from "@prisma/client";
import { prisma } from "../prisma.js";
import { AppError } from "../errors/AppError.js";
import { AuthUser, ProjectPolicy } from "../policies/project.policy.js";
import { CreateProjectInput, UpdateProjectInput } from "../validation/project.schema.js";

export class ProjectService {
  async listProjects(user: AuthUser) {
    if (user.role === Role.DEVELOPER) {
      return [];
    }

    const where = user.role === Role.ADMIN ? {} : { createdById: user.id };

    return prisma.project.findMany({
      where,
      include: {
        client: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async getProjectById(user: AuthUser, projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        tasks: {
          include: {
            assignedDeveloper: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { dueDate: "asc" },
        },
      },
    });

    if (!project) {
      throw AppError.notFound("Project not found");
    }

    if (!ProjectPolicy.canView(user, project)) {
      throw AppError.forbidden("You do not have permission to view this project");
    }

    return project;
  }

  async createProject(user: AuthUser, input: CreateProjectInput) {
    if (!ProjectPolicy.canCreate(user)) {
      throw AppError.forbidden("Only Administrators and Project Managers can create projects");
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: input.clientId },
    });
    if (!client) {
      throw AppError.badRequest("Specified client does not exist");
    }

    return prisma.project.create({
      data: {
        name: input.name,
        description: input.description,
        clientId: input.clientId,
        createdById: user.id,
      },
      include: {
        client: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  async updateProject(user: AuthUser, projectId: string, input: UpdateProjectInput) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw AppError.notFound("Project not found");
    }

    if (!ProjectPolicy.canManage(user, project)) {
      throw AppError.forbidden("You do not have permission to modify this project");
    }

    if (input.clientId) {
      const client = await prisma.client.findUnique({
        where: { id: input.clientId },
      });
      if (!client) {
        throw AppError.badRequest("Specified client does not exist");
      }
    }

    return prisma.project.update({
      where: { id: projectId },
      data: {
        name: input.name,
        description: input.description,
        clientId: input.clientId,
      },
      include: {
        client: true,
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  async deleteProject(user: AuthUser, projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw AppError.notFound("Project not found");
    }

    if (!ProjectPolicy.canManage(user, project)) {
      throw AppError.forbidden("You do not have permission to delete this project");
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    return { success: true };
  }
}

export const projectService = new ProjectService();
