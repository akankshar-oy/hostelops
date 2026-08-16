import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import {
  listNotificationsHandler,
  markAllNotificationsReadHandler,
  markNotificationReadHandler,
  unreadCountHandler,
} from "./notification.controller";

const router = Router();

router.use(authenticate);

router.get("/", listNotificationsHandler);
router.get("/unread-count", unreadCountHandler);
router.patch("/read-all", markAllNotificationsReadHandler);
router.patch("/:id/read", markNotificationReadHandler);

export default router;
