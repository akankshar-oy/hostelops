import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { UserRole } from "../users/user.model";
import {
  addCommentHandler,
  createComplaintHandler,
  getComplaintHandler,
  getComplaintHistoryHandler,
  listCommentsHandler,
  listComplaintsHandler,
} from "./complaint.controller";
import { createCommentSchema, createComplaintSchema } from "./complaint.validation";

const router = Router();

router.use(authenticate);

router.post("/", authorize(UserRole.STUDENT), validate(createComplaintSchema), createComplaintHandler);
router.get("/", listComplaintsHandler);
router.get("/:id", getComplaintHandler);
router.get("/:id/history", getComplaintHistoryHandler);
router.post("/:id/comments", validate(createCommentSchema), addCommentHandler);
router.get("/:id/comments", listCommentsHandler);

export default router;
