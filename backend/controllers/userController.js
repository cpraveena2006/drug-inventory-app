import User from "../models/User.js";
import Supplier from "../models/Supplier.js";
import AppError from "../utils/AppError.js";
import logAction from "../utils/logAction.js";

export async function listUsers(req, res) {
  const users = await User.find().select("-password").populate("supplier", "name").sort({ createdAt: -1 });
  res.json(users);
}

export async function createUser(req, res) {
  const { name, email, password, role, supplier } = req.body;
  if (role === "supplier") {
    const supplierExists = await Supplier.exists({ _id: supplier, isActive: true, isDeleted: { $ne: true } });
    if (!supplierExists) throw new AppError("An active supplier account is required", 400, "INVALID_SUPPLIER");
  }
  const user = await User.create({
    name,
    email,
    password,
    role,
    ...(role === "supplier" ? { supplier } : {}),
  });
  await logAction({
    userId: req.user._id,
    action: "USER_CREATED",
    entityType: "User",
    entityId: user._id,
    details: { email: user.email, role },
  });
  res.status(201).json(user.toSafeObject());
}

export async function updateUser(req, res) {
  const targetId = req.params.id;
  if (String(req.user._id) === targetId && (req.body.role || req.body.isActive === false)) {
    throw new AppError("You cannot change your own role or deactivate your account", 400, "SELF_MODIFICATION_FORBIDDEN");
  }
  const user = await User.findById(targetId);
  if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
  const nextRole = req.body.role || user.role;
  const nextSupplier = req.body.supplier || user.supplier;
  if (nextRole === "supplier") {
    const supplierExists = await Supplier.exists({
      _id: nextSupplier,
      isActive: true,
      isDeleted: { $ne: true },
    });
    if (!supplierExists) throw new AppError("Supplier role requires an active linked supplier", 400, "INVALID_SUPPLIER");
    user.supplier = nextSupplier;
  } else {
    user.supplier = undefined;
  }
  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.email !== undefined) user.email = req.body.email;
  if (req.body.password !== undefined) user.password = req.body.password;
  if (req.body.role !== undefined) user.role = req.body.role;
  if (req.body.isActive !== undefined) user.isActive = req.body.isActive;
  await user.save();
  await logAction({
    userId: req.user._id,
    action: "USER_UPDATED",
    entityType: "User",
    entityId: user._id,
    details: { role: user.role, isActive: user.isActive },
  });
  res.json(user.toSafeObject());
}
