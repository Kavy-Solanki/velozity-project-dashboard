import { Router } from "express";
import { Role } from "@prisma/client";
import { clientController } from "../controllers/client.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { authorizeRole } from "../middleware/authorizeRole.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { createClientSchema } from "../validation/client.schema.js";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  authorizeRole(Role.ADMIN, Role.PROJECT_MANAGER),
  (req, res, next) => clientController.listClients(req, res, next),
);

router.post(
  "/",
  authorizeRole(Role.ADMIN, Role.PROJECT_MANAGER),
  validateRequest(createClientSchema, "body"),
  (req, res, next) => clientController.createClient(req, res, next),
);

export default router;
