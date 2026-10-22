import express from "express";
import { protect } from "../middleware/auth.js";
import { restrictTo } from "../middleware/role.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getReorderSuggestions } from "../controllers/reportController.js";

const router = express.Router();
router.use(protect, restrictTo("admin", "pharmacist"));
router.get("/reorder-suggestions", asyncHandler(getReorderSuggestions));

export default router;
