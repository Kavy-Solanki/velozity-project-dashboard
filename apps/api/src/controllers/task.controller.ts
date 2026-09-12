import { Request, Response, NextFunction } from "express";
import { taskService } from "../services/task.service.js";

export class TaskController {
  async listTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tasks = await taskService.listTasks(req.user!, req.query as any);
      res.status(200).json({ data: tasks });
    } catch (err) {
      next(err);
    }
  }

  async getTaskById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const task = await taskService.getTaskById(req.user!, id);
      res.status(200).json({ data: task });
    } catch (err) {
      next(err);
    }
  }

  async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const task = await taskService.createTask(req.user!, req.body);
      res.status(201).json({ data: task });
    } catch (err) {
      next(err);
    }
  }

  async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const task = await taskService.updateTask(req.user!, id, req.body);
      res.status(200).json({ data: task });
    } catch (err) {
      next(err);
    }
  }

  async updateTaskStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const task = await taskService.updateTaskStatus(
        req.user!,
        id,
        req.body.status,
      );
      res.status(200).json({ data: task });
    } catch (err) {
      next(err);
    }
  }

  async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const result = await taskService.deleteTask(req.user!, id);
      res.status(200).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
}

export const taskController = new TaskController();
