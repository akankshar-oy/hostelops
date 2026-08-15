import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { UserRole } from "../users/user.model";
import {
  addCommentHandler,
  assignComplaintHandler,
  createComplaintHandler,
  getComplaintHandler,
  getComplaintHistoryHandler,
  listCommentsHandler,
  listComplaintsHandler,
  rateComplaintHandler,
  updateStatusHandler,
} from "./complaint.controller";
import {
  assignComplaintSchema,
  createCommentSchema,
  createComplaintSchema,
  rateComplaintSchema,
  updateStatusSchema,
} from "./complaint.validation";

const router = Router();

router.use(authenticate);

router.post("/", authorize(UserRole.STUDENT), validate(createComplaintSchema), createComplaintHandler);
router.get("/", listComplaintsHandler);
router.get("/:id", getComplaintHandler);
router.get("/:id/history", getComplaintHistoryHandler);
router.post("/:id/comments", validate(createCommentSchema), addCommentHandler);
router.get("/:id/comments", listCommentsHandler);
router.patch("/:id/status", validate(updateStatusSchema), updateStatusHandler);
router.patch("/:id/rating", validate(rateComplaintSchema), rateComplaintHandler);
router.post(
  "/:id/assign",
  authorize(UserRole.WARDEN, UserRole.ADMIN),
  validate(assignComplaintSchema),
  assignComplaintHandler
);

export default router;
