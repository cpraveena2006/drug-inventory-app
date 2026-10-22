import express from "express";
import {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  getExpiryAlerts,
  getLowStockAlerts,
  reportDamage,
  updateBatchQuality,
  restoreBatch,
} from "../controllers/batchController.js";
import { protect } from "../middleware/auth.js";
import { restrictTo } from "../middleware/role.js";
import { z } from "zod";
import validateRequest from "../middleware/validateRequest.js";
import asyncHandler from "../utils/asyncHandler.js";
import { batchBody, batchUpdateBody, idParams } from "../validators/index.js";
import { getBatchDetails } from "../controllers/insightController.js";

const router = express.Router();

router.use(protect);
router.patch("/:id/restore", restrictTo("admin"), validateRequest({ params: idParams }), asyncHandler(restoreBatch));
router.get("/:id/details", validateRequest({ params: idParams }), asyncHandler(getBatchDetails));

router.get("/alerts/expiry", getExpiryAlerts);
router.get("/alerts/low-stock", getLowStockAlerts);
router.post("/:id/report-damage", restrictTo("admin", "pharmacist"), validateRequest({
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }),
  body: z.object({
    quantity: z.coerce.number().int().positive(),
    reason: z.string().trim().min(3).max(2000),
    tags: z.array(z.string().trim().max(80)).optional(),
  }),
}), asyncHandler(reportDamage));
router.patch("/:id/quality", restrictTo("admin", "pharmacist"), validateRequest({
  params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i) }),
  body: z.object({
    qualityRating: z.number().int().min(1).max(5).optional(),
    qualityNotes: z.string().trim().max(2000).optional(),
    qualityTags: z.array(z.string().trim().max(80)).optional(),
  }).refine((value) => Object.keys(value).length > 0, "At least one field is required"),
}), asyncHandler(updateBatchQuality));

router.route("/")
  .get(getBatches)
  .post(restrictTo("admin", "pharmacist"), validateRequest({ body: batchBody }), createBatch);

router.route("/:id")
  .get(getBatchById)
  .put(restrictTo("admin", "pharmacist"), validateRequest({ params: idParams, body: batchUpdateBody }), updateBatch)
  .delete(restrictTo("admin"), deleteBatch);

export default router;
