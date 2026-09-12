import { Router } from "express";
import { Role } from "@prisma/client";
import { projectController } from "../controllers/project.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRole } from "../middleware/authorizeRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { createProjectSchema, updateProjectSchema } from "../validation/project.schema.js";

const router = Router();

router.use(authenticate);

router.get("/", (req, res, next) => projectController.listProjects(req, res, next));
router.get("/:id", (req, res, next) => projectController.getProjectById(req, res, next));

router.post(
  "/",
  authorizeRole(Role.ADMIN, Role.PROJECT_MANAGER),
  validateRequest(createProjectSchema, "body"),
  (req, res, next) => projectController.createProject(req, res, next),
);

router.patch(
  "/:id",
  authorizeRole(Role.ADMIN, Role.PROJECT_MANAGER),
  validateRequest(updateProjectSchema, "body"),
  (req, res, next) => projectController.updateProject(req, res, next),
);

router.delete(
  "/:id",
  authorizeRole(Role.ADMIN, Role.PROJECT_MANAGER),
  (req, res, next) => projectController.deleteProject(req, res, next),
);

export default router;
