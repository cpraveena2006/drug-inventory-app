import express from "express";
import { protect } from "../middleware/auth.js";
import { restrictTo } from "../middleware/role.js";
import asyncHandler from "../utils/asyncHandler.js";
import { getSupplierInbox } from "../controllers/inquiryController.js";

const router = express.Router();
router.use(protect, restrictTo("supplier"));
router.get("/inbox", asyncHandler(getSupplierInbox));

export default router;
