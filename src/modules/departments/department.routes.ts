import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { UserRole } from "../users/user.model";
import {
  createDepartmentHandler,
  listDepartmentsHandler,
  listDepartmentStaffHandler,
} from "./department.controller";
import { createDepartmentSchema } from "./department.validation";

const router = Router();

router.use(authenticate);

router.get("/", listDepartmentsHandler);
router.get("/:id/staff", authorize(UserRole.WARDEN, UserRole.ADMIN), listDepartmentStaffHandler);
router.post("/", authorize(UserRole.ADMIN), validate(createDepartmentSchema), createDepartmentHandler);

export default router;
