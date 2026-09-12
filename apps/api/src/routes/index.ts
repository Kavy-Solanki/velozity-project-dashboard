import { Router } from "express";
import authRoutes from "./auth.routes.js";
import clientRoutes from "./client.routes.js";
import projectRoutes from "./project.routes.js";
import taskRoutes from "./task.routes.js";
import activityRoutes from "./activity.routes.js";
import notificationRoutes from "./notification.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/auth", authRoutes);
router.use("/clients", clientRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);
router.use("/activity", activityRoutes);
router.use("/notifications", notificationRoutes);

export default router;
