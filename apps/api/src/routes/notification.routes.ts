import { Router } from "express";
import { notificationController } from "../controllers/notification.controller.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

router.use(authenticate);

router.get("/", (req, res, next) => notificationController.listNotifications(req, res, next));
router.get("/unread-count", (req, res, next) => notificationController.getUnreadCount(req, res, next));
router.patch("/:id/read", (req, res, next) => notificationController.markAsRead(req, res, next));
router.post("/read-all", (req, res, next) => notificationController.markAllAsRead(req, res, next));

export default router;
