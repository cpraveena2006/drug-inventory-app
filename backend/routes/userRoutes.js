import express from "express";
import { z } from "zod";
import { protect } from "../middleware/auth.js";
import { restrictTo } from "../middleware/role.js";
import validateRequest from "../middleware/validateRequest.js";
import asyncHandler from "../utils/asyncHandler.js";
import { idParams, objectId } from "../validators/index.js";
import { createUser, listUsers, updateUser } from "../controllers/userController.js";

const router = express.Router();
router.use(protect, restrictTo("admin"));
router.get("/", asyncHandler(listUsers));
router.post("/", validateRequest({
  body: z.object({
    name: z.string().trim().min(1).max(100),
    email: z.string().trim().email().max(254),
    password: z.string().min(6).max(128),
    role: z.enum(["admin", "pharmacist", "supplier"]),
    supplier: objectId.optional(),
  }).refine((value) => (value.role === "supplier") === Boolean(value.supplier), "Supplier accounts require a supplier link"),
}), asyncHandler(createUser));
router.patch("/:id", validateRequest({
  params: idParams,
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.string().trim().email().max(254).optional(),
    password: z.string().min(6).max(128).optional(),
    role: z.enum(["admin", "pharmacist", "supplier"]).optional(),
    supplier: objectId.optional(),
    isActive: z.boolean().optional(),
  }).refine((value) => Object.keys(value).length > 0, "At least one field is required"),
}), asyncHandler(updateUser));

export default router;
