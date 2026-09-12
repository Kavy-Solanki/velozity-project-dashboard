import { Request, Response, NextFunction } from "express";
import { projectService } from "../services/project.service.js";

export class ProjectController {
  async listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projects = await projectService.listProjects(req.user!);
      res.status(200).json({ data: projects });
    } catch (err) {
      next(err);
    }
  }

  async getProjectById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const project = await projectService.getProjectById(req.user!, id);
      res.status(200).json({ data: project });
    } catch (err) {
      next(err);
    }
  }

  async createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectService.createProject(req.user!, req.body);
      res.status(201).json({ data: project });
    } catch (err) {
      next(err);
    }
  }

  async updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const project = await projectService.updateProject(req.user!, id, req.body);
      res.status(200).json({ data: project });
    } catch (err) {
      next(err);
    }
  }

  async deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const result = await projectService.deleteProject(req.user!, id);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const projectController = new ProjectController();
