import { Router } from "express";
import { Role } from "@prisma/client";
import { taskController } from "../controllers/task.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRole } from "../middleware/authorizeRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
  listTasksQuerySchema,
} from "../validation/task.schema.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  validateRequest(listTasksQuerySchema, "query"),
  (req, res, next) => taskController.listTasks(req, res, next),
);

router.get("/:id", (req, res, next) => taskController.getTaskById(req, res, next));

router.post(
  "/",
  authorizeRole(Role.ADMIN, Role.PROJECT_MANAGER),
  validateRequest(createTaskSchema, "body"),
  (req, res, next) => taskController.createTask(req, res, next),
);

router.patch(
  "/:id",
  authorizeRole(Role.ADMIN, Role.PROJECT_MANAGER),
  validateRequest(updateTaskSchema, "body"),
  (req, res, next) => taskController.updateTask(req, res, next),
);

router.patch(
  "/:id/status",
  validateRequest(updateTaskStatusSchema, "body"),
  (req, res, next) => taskController.updateTaskStatus(req, res, next),
);

router.delete(
  "/:id",
  authorizeRole(Role.ADMIN, Role.PROJECT_MANAGER),
  (req, res, next) => taskController.deleteTask(req, res, next),
);

export default router;
