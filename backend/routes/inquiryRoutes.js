import express from "express";
import { z } from "zod";
import { protect } from "../middleware/auth.js";
import { restrictTo } from "../middleware/role.js";
import validateRequest from "../middleware/validateRequest.js";
import asyncHandler from "../utils/asyncHandler.js";
import { idParams, objectId } from "../validators/index.js";
import {
  chooseInquirySupplier,
  createInquiry,
  listInquiries,
  respondToInquiry,
} from "../controllers/inquiryController.js";

const router = express.Router();
router.use(protect);
router.get("/", restrictTo("admin", "pharmacist"), validateRequest({
  query: z.object({ drugRequestId: objectId.optional() }),
}), asyncHandler(listInquiries));
router.post("/", restrictTo("admin", "pharmacist"), validateRequest({
  body: z.object({
    drugRequestId: objectId,
    supplierIds: z.array(objectId).min(1).max(50).refine((ids) => new Set(ids).size === ids.length, "Supplier ids must be unique"),
    quantityNeeded: z.coerce.number().int().positive(),
    neededBy: z.coerce.date().optional(),
    message: z.string().trim().max(2000).optional(),
  }),
}), asyncHandler(createInquiry));
router.post("/:id/respond", restrictTo("supplier"), validateRequest({
  params: idParams,
  body: z.object({
    available: z.boolean(),
    availableQuantity: z.coerce.number().int().min(0).optional(),
    unitPrice: z.coerce.number().min(0).optional(),
    leadTimeDays: z.coerce.number().int().min(0).optional(),
    note: z.string().trim().max(2000).optional(),
  }).superRefine((value, context) => {
    if (value.available && (value.availableQuantity === undefined || value.availableQuantity < 1 || value.unitPrice === undefined || value.leadTimeDays === undefined)) {
      context.addIssue({ code: "custom", message: "Available responses require quantity, unit price, and lead time" });
    }
  }),
}), asyncHandler(respondToInquiry));
router.post("/:id/choose", restrictTo("admin", "pharmacist"), validateRequest({
  params: idParams,
  body: z.object({ supplierId: objectId }),
}), asyncHandler(chooseInquirySupplier));

export default router;
