import express from "express";
import { register, login, getMe } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { z } from "zod";
import validateRequest from "../middleware/validateRequest.js";

const router = express.Router();

router.post("/register", validateRequest({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(254),
    password: z.string().min(6).max(128),
  }),
}), register);
router.post("/login", validateRequest({
  body: z.object({
    email: z.string().trim().email().max(254),
    password: z.string().min(1).max(128),
  }),
}), login);
router.get("/me", protect, getMe);

export default router;
