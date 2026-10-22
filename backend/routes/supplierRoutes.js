import express from "express";
import {
  createSupplier,
  getSuppliers,
  updateSupplier,
  deleteSupplier,
  restoreSupplier,
} from "../controllers/supplierController.js";
import { protect } from "../middleware/auth.js";
import { restrictTo } from "../middleware/role.js";
import validateRequest from "../middleware/validateRequest.js";
import { idParams, supplierBody, supplierUpdateBody } from "../validators/index.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getSupplierLeaderboard, getSupplierScorecard } from "../controllers/insightController.js";

const router = express.Router();

router.use(protect);
router.patch("/:id/restore", restrictTo("admin"), validateRequest({ params: idParams }), asyncHandler(restoreSupplier));
router.get("/leaderboard", restrictTo("admin", "pharmacist", "supplier"), asyncHandler(getSupplierLeaderboard));
router.get("/:id/scorecard", restrictTo("admin", "pharmacist", "supplier"), validateRequest({ params: idParams }), asyncHandler(getSupplierScorecard));

router.route("/")
  .get(getSuppliers)
  .post(restrictTo("admin", "pharmacist"), validateRequest({ body: supplierBody }), createSupplier);

router.route("/:id")
  .put(restrictTo("admin", "pharmacist"), validateRequest({ params: idParams, body: supplierUpdateBody }), updateSupplier)
  .delete(restrictTo("admin"), deleteSupplier);

export default router;
