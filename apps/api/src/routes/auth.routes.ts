import { Router } from "express";
import { authController } from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { loginSchema } from "../validation/auth.schema.js";
import { Role } from "@prisma/client";
import { authorizeRole } from "../middleware/authorizeRole.js";

const router = Router();

router.post("/login", validateRequest(loginSchema, "body"), (req, res, next) =>
  authController.login(req, res, next),
);
router.post("/refresh", (req, res, next) => authController.refresh(req, res, next));
router.post("/logout", (req, res, next) => authController.logout(req, res, next));
router.get("/me", authenticate, (req, res, next) => authController.me(req, res, next));
router.get(
  "/users",
  authenticate,
  authorizeRole(Role.ADMIN, Role.PROJECT_MANAGER),
  (req, res, next) => authController.listUsers(req, res, next),
);

export default router;
