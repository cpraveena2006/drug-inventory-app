import express from "express";
import { z } from "zod";
import { protect } from "../middleware/auth.js";
import { restrictTo } from "../middleware/role.js";
import validateRequest from "../middleware/validateRequest.js";
import asyncHandler from "../utils/asyncHandler.js";
import {
  createManualIncident,
  getIncident,
  getIncidents,
  notifyIncidentSupplier,
  respondToIncident,
  updateIncidentStatus,
} from "../controllers/incidentController.js";

const router = express.Router();
const idParams = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) });

router.use(protect);
router.get("/", asyncHandler(getIncidents));
router.get("/:id", validateRequest({ params: idParams }), asyncHandler(getIncident));
router.post("/", restrictTo("admin", "pharmacist"), validateRequest({
  body: z.object({
    type: z.enum(["STOCKOUT", "LOW_STOCK", "DAMAGED", "EXPIRED", "NEAR_EXPIRY", "RECALLED", "QUALITY_ISSUE"]),
    drug: z.string().regex(/^[a-f\d]{24}$/i),
    batch: z.string().regex(/^[a-f\d]{24}$/i).optional(),
    supplier: z.string().regex(/^[a-f\d]{24}$/i),
    quantityAffected: z.number().min(0).default(0),
    reason: z.string().trim().min(3).max(2000),
  }),
}), asyncHandler(createManualIncident));
router.patch("/:id/status", restrictTo("admin", "pharmacist"), validateRequest({
  params: idParams,
  body: z.object({
    status: z.enum(["open", "supplier_notified", "acknowledged", "resolved"]),
    supplierResponse: z.string().trim().max(2000).optional(),
  }),
}), asyncHandler(updateIncidentStatus));
router.post("/:id/respond", restrictTo("supplier"), validateRequest({
  params: idParams,
  body: z.object({ response: z.string().trim().min(1).max(2000) }),
}), asyncHandler(respondToIncident));
router.post("/:id/notify", restrictTo("admin", "pharmacist"), validateRequest({ params: idParams }), asyncHandler(notifyIncidentSupplier));

export default router;
