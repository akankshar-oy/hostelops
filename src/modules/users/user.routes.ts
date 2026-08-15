import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { validate } from "../../middleware/validate";
import { UserRole } from "./user.model";
import { createUserHandler } from "./user.controller";
import { createUserSchema } from "./user.validation";

const router = Router();

router.use(authenticate);
router.post("/", authorize(UserRole.ADMIN), validate(createUserSchema), createUserHandler);

export default router;
