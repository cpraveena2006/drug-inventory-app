import Incident from "../models/Incident.js";
import AppError from "../utils/AppError.js";
import { createIncident } from "../services/incidentService.js";
import { notifySupplier } from "../services/notificationService.js";

export async function getIncidents(req, res) {
  const { type, status, supplier, drug, from, to, page = "1", limit = "25" } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (drug) filter.drug = drug;
  if (req.user.role === "supplier") filter.supplier = req.user.supplier;
  else if (supplier) filter.supplier = supplier;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  const pageNumber = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 25));
  const [items, total] = await Promise.all([
    Incident.find(filter).populate("drug", "name").populate("batch", "batchNumber").populate("supplier", "name").sort({ createdAt: -1 }).skip((pageNumber - 1) * pageSize).limit(pageSize),
    Incident.countDocuments(filter),
  ]);
  res.json({ items, page: pageNumber, limit: pageSize, total, pages: Math.ceil(total / pageSize) });
}

export async function getIncident(req, res) {
  const incident = await Incident.findOne({
    _id: req.params.id,
    ...(req.user.role === "supplier" ? { supplier: req.user.supplier } : {}),
  }).populate("drug batch supplier");
  if (!incident) throw new AppError("Incident not found", 404, "NOT_FOUND");
  res.json(incident);
}

export async function createManualIncident(req, res) {
  const incident = await createIncident({ ...req.body, reportedBy: req.user._id });
  res.status(201).json(incident);
}

export async function updateIncidentStatus(req, res) {
  const incident = await Incident.findOneAndUpdate(
    { _id: req.params.id, ...(req.user.role === "supplier" ? { supplier: req.user.supplier } : {}) },
    {
      $set: {
        status: req.body.status,
        ...(req.body.status === "resolved" ? { resolvedAt: new Date() } : {}),
        ...(req.body.supplierResponse ? { supplierResponse: req.body.supplierResponse } : {}),
      },
    },
    { new: true, runValidators: true }
  );
  if (!incident) throw new AppError("Incident not found", 404, "NOT_FOUND");
  res.json(incident);
}

export async function respondToIncident(req, res) {
  const incident = await Incident.findOneAndUpdate(
    { _id: req.params.id, supplier: req.user.supplier },
    { $set: { status: "acknowledged", supplierResponse: req.body.response } },
    { new: true, runValidators: true }
  );
  if (!incident) throw new AppError("Incident not found", 404, "NOT_FOUND");
  res.json(incident);
}

export async function notifyIncidentSupplier(req, res) {
  const incident = await Incident.findById(req.params.id);
  if (!incident) throw new AppError("Incident not found", 404, "NOT_FOUND");
  await notifySupplier({
    supplierId: incident.supplier,
    type: "incident",
    title: `${incident.type.replaceAll("_", " ")} incident update`,
    message: incident.reason,
    relatedModel: "Incident",
    relatedId: incident._id,
  });
  incident.status = "supplier_notified";
  incident.supplierNotifiedAt = new Date();
  await incident.save();
  res.json(incident);
}
