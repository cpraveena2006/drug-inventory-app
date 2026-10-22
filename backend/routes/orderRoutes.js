import express from "express";
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

const router = express.Router();

router.use(protect);

router.get("/", getOrders);
router.get("/:id", getOrderById);
router.post("/purchase", restrictTo("admin", "pharmacist"), createPurchaseOrder);
router.post("/dispatch", restrictTo("admin", "pharmacist"), createDispatchOrder);
router.post("/:id/receive", restrictTo("admin", "pharmacist"), receivePurchaseOrder);
router.patch("/:id/status", restrictTo("admin", "pharmacist"), updateOrderStatus);

export default router;
