import express from "express";
import { getDashboardStats, getDemandForecast } from "../controllers/dashboardController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, getDashboardStats);
router.get("/demand", protect, getDemandForecast);

export default router;
