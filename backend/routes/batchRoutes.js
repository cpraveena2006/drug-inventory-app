import express from "express";
import {
  createBatch,
  getBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  getExpiryAlerts,
  getLowStockAlerts,
} from "../controllers/batchController.js";
import { protect } from "../middleware/auth.js";
import { restrictTo } from "../middleware/role.js";

const router = express.Router();

router.use(protect);

router.get("/alerts/expiry", getExpiryAlerts);
router.get("/alerts/low-stock", getLowStockAlerts);

router.route("/")
  .get(getBatches)
  .post(restrictTo("admin", "pharmacist"), createBatch);

router.route("/:id")
  .get(getBatchById)
  .put(restrictTo("admin", "pharmacist"), updateBatch)
  .delete(restrictTo("admin"), deleteBatch);

export default router;
