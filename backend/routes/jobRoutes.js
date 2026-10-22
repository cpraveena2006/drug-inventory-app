import express from "express";
import { protect } from "../middleware/auth.js";
import { restrictTo } from "../middleware/role.js";
import asyncHandler from "../utils/asyncHandler.js";
import { runExpiryJob } from "../controllers/jobController.js";

const router = express.Router();
router.use(protect, restrictTo("admin"));
router.post("/run-expiry-check", asyncHandler(runExpiryJob));

export default router;
