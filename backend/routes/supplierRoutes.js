import express from "express";
import {
  createSupplier,
  getSuppliers,
  updateSupplier,
  deleteSupplier,
} from "../controllers/supplierController.js";
import { protect } from "../middleware/auth.js";
import { restrictTo } from "../middleware/role.js";

const router = express.Router();

router.use(protect);

router.route("/")
  .get(getSuppliers)
  .post(restrictTo("admin", "pharmacist"), createSupplier);

router.route("/:id")
  .put(restrictTo("admin", "pharmacist"), updateSupplier)
  .delete(restrictTo("admin"), deleteSupplier);

export default router;
