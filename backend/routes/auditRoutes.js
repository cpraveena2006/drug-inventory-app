import express from "express";
import { z } from "zod";
import { protect } from "../middleware/auth.js";
import { restrictTo } from "../middleware/role.js";
import validateRequest from "../middleware/validateRequest.js";
import asyncHandler from "../utils/asyncHandler.js";
import { idParams, objectId } from "../validators/index.js";
import { getAuditLog, getAuditLogs } from "../controllers/auditController.js";

const router = express.Router();
router.use(protect, restrictTo("admin"));
router.get("/", validateRequest({
  query: z.object({
    action: z.string().max(100).optional(),
    entityType: z.string().max(100).optional(),
    user: objectId.optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
}), asyncHandler(getAuditLogs));
router.get("/:id", validateRequest({ params: idParams }), asyncHandler(getAuditLog));

export default router;
