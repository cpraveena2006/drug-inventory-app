import express from "express";
import { z } from "zod";
import { protect } from "../middleware/auth.js";
import { restrictTo } from "../middleware/role.js";
import validateRequest from "../middleware/validateRequest.js";
import asyncHandler from "../utils/asyncHandler.js";
import { idParams } from "../validators/index.js";
import {
  createRequest,
  getRequest,
  getRequests,
  getTopDemand,
  updateRequestStatus,
} from "../controllers/requestController.js";

const router = express.Router();
router.use(protect, restrictTo("admin", "pharmacist"));
router.get("/analytics/top-demand", validateRequest({
  query: z.object({ days: z.enum(["30", "90"]).optional() }),
}), asyncHandler(getTopDemand));
router.get("/", validateRequest({
  query: z.object({
    status: z.enum(["open", "inquiry_sent", "sourced", "fulfilled", "cancelled"]).optional(),
    q: z.string().max(100).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
}), asyncHandler(getRequests));
router.post("/", validateRequest({
  body: z.object({
    drugName: z.string().trim().min(1).max(200),
    quantity: z.coerce.number().int().positive(),
    customerName: z.string().trim().max(150).optional(),
    customerContact: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(1000).optional(),
  }),
}), asyncHandler(createRequest));
router.get("/:id", validateRequest({ params: idParams }), asyncHandler(getRequest));
router.patch("/:id/status", validateRequest({
  params: idParams,
  body: z.object({ status: z.enum(["open", "inquiry_sent", "sourced", "fulfilled", "cancelled"]) }),
}), asyncHandler(updateRequestStatus));

export default router;
