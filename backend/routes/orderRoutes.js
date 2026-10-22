import express from "express";
import { z } from "zod";
import {
  createPurchaseOrder,
  createDispatchOrder,
  receivePurchaseOrder,
  updateOrderStatus,
  getOrders,
  getOrderById,
} from "../controllers/orderController.js";
import { protect } from "../middleware/auth.js";
import { restrictTo } from "../middleware/role.js";
import validateRequest from "../middleware/validateRequest.js";
import { dispatchOrderBody, idParams, purchaseOrderBody } from "../validators/index.js";

const router = express.Router();

router.use(protect);

router.get("/", getOrders);
router.get("/:id", validateRequest({ params: idParams }), getOrderById);
router.post("/purchase", restrictTo("admin", "pharmacist"), validateRequest({ body: purchaseOrderBody }), createPurchaseOrder);
router.post("/dispatch", restrictTo("admin", "pharmacist"), validateRequest({ body: dispatchOrderBody }), createDispatchOrder);
router.post("/:id/receive", restrictTo("admin", "pharmacist"), validateRequest({
  params: idParams,
  body: z.object({
    batchDetails: z.array(z.object({
      drugId: idParams.shape.id,
      batchNumber: z.string().trim().min(1).max(100),
      manufactureDate: z.coerce.date(),
      expiryDate: z.coerce.date(),
      warehouseLocation: z.string().trim().max(200).optional(),
    })).min(1),
  }),
}), receivePurchaseOrder);
router.patch("/:id/status", restrictTo("admin", "pharmacist"), validateRequest({
  params: idParams,
  body: z.object({ status: z.enum(["pending", "approved", "shipped", "delivered", "cancelled"]) }),
}), updateOrderStatus);

export default router;
