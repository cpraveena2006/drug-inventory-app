import AuditLog from "../models/AuditLog.js";
import AppError from "../utils/AppError.js";

export async function getAuditLogs(req, res) {
  const filter = {};
  const { action, entityType, user, from, to } = req.query;
  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;
  if (user) filter.user = user;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const [items, total] = await Promise.all([
    AuditLog.find(filter).populate("user", "name email").sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    AuditLog.countDocuments(filter),
  ]);
  res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
}

export async function getAuditLog(req, res) {
  const item = await AuditLog.findById(req.params.id).populate("user", "name email");
  if (!item) throw new AppError("Audit log not found", 404, "NOT_FOUND");
  res.json(item);
}
