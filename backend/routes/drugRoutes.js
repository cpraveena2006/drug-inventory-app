import express from "express";
import {
  createDrug,
  getDrugs,
  getDrugById,
  updateDrug,
  deleteDrug,
  restoreDrug,
} from "../controllers/drugController.js";
import { protect } from "../middleware/auth.js";
import { restrictTo } from "../middleware/role.js";
import validateRequest from "../middleware/validateRequest.js";
import { drugBody, drugUpdateBody, idParams } from "../validators/index.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getDrugInsights } from "../controllers/insightController.js";

const router = express.Router();

router.use(protect);
router.patch("/:id/restore", restrictTo("admin"), validateRequest({ params: idParams }), asyncHandler(restoreDrug));
router.get("/:id/insights", restrictTo("admin", "pharmacist"), validateRequest({ params: idParams }), asyncHandler(getDrugInsights));

router.route("/")
  .get(getDrugs)
  .post(restrictTo("admin", "pharmacist"), validateRequest({ body: drugBody }), createDrug);

router.route("/:id")
  .get(getDrugById)
  .put(restrictTo("admin", "pharmacist"), validateRequest({ params: idParams, body: drugUpdateBody }), updateDrug)
  .delete(restrictTo("admin"), deleteDrug);

export default router;
