import express from "express";
import {
  createDrug,
  getDrugs,
  getDrugById,
  updateDrug,
  deleteDrug,
} from "../controllers/drugController.js";
import { protect } from "../middleware/auth.js";
import { restrictTo } from "../middleware/role.js";

const router = express.Router();

router.use(protect);

router.route("/")
  .get(getDrugs)
  .post(restrictTo("admin", "pharmacist"), createDrug);

router.route("/:id")
  .get(getDrugById)
  .put(restrictTo("admin", "pharmacist"), updateDrug)
  .delete(restrictTo("admin"), deleteDrug);

export default router;
