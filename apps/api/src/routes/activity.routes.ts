import { Router } from "express";
import { activityController } from "../controllers/activity.controller.js";
import { authenticate } from "../middleware/authenticate.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { catchupQuerySchema } from "../validation/activity.schema.js";

const router = Router();

router.use(authenticate);

router.get(
  "/catchup",
  validateRequest(catchupQuerySchema, "query"),
  (req, res, next) => activityController.getCatchup(req, res, next),
);

export default router;
