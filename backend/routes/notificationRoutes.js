import express from "express";
import { z } from "zod";
import { protect } from "../middleware/auth.js";
import validateRequest from "../middleware/validateRequest.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notificationController.js";

const router = express.Router();
router.use(protect);
router.get("/", asyncHandler(getNotifications));
router.get("/unread-count", asyncHandler(getUnreadCount));
router.patch("/read-all", asyncHandler(markAllNotificationsRead));
router.patch("/:id/read", validateRequest({
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }),
}), asyncHandler(markNotificationRead));

export default router;
