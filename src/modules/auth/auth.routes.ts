import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authRateLimiter } from "../../middleware/authRateLimiter";
import { validate } from "../../middleware/validate";
import {
  loginHandler,
  logoutHandler,
  meHandler,
  refreshHandler,
  registerHandler,
} from "./auth.controller";
import { loginSchema, registerSchema } from "./auth.validation";

const router = Router();

router.post("/register", authRateLimiter, validate(registerSchema), registerHandler);
router.post("/login", authRateLimiter, validate(loginSchema), loginHandler);
router.post("/refresh", authRateLimiter, refreshHandler);
router.post("/logout", authenticate, logoutHandler);
router.get("/me", authenticate, meHandler);

export default router;
