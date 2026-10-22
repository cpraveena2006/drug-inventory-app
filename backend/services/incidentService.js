import Incident from "../models/Incident.js";
import Drug from "../models/Drug.js";
import Batch from "../models/Batch.js";
import { notifySupplier } from "./notificationService.js";

const severityForType = {
  STOCKOUT: "critical",
  LOW_STOCK: "warning",
  DAMAGED: "warning",
  EXPIRED: "critical",
  NEAR_EXPIRY: "warning",
  RECALLED: "critical",
  QUALITY_ISSUE: "warning",
};

export async function createIncident(input) {
  let incident;
  try {
    incident = await Incident.create({
      ...input,
      severity: input.severity || severityForType[input.type],
    });
  } catch (error) {
    if (error.code !== 11000 || !input.dedupeKey) throw error;
    incident = await Incident.findOne({ dedupeKey: input.dedupeKey });
    if (incident) return incident;
    throw error;
  }

  await notifySupplier({
    supplierId: incident.supplier,
    type: "incident",
    title: `${incident.type.replaceAll("_", " ")} incident reported`,
    message: incident.reason,
    relatedModel: "Incident",
    relatedId: incident._id,
  });
  incident.status = "supplier_notified";
  incident.supplierNotifiedAt = new Date();
  await incident.save();
  return incident;
}

export async function checkDrugStock(drugId, reportedBy) {
  const drug = await Drug.findOne({ _id: drugId, isDeleted: { $ne: true } });
  if (!drug) return [];
  const now = new Date();
  const [totals, recentBatch] = await Promise.all([
    Batch.aggregate([
      { $match: { drug: drug._id, status: "active", isDeleted: { $ne: true }, expiryDate: { $gt: now } } },
      { $group: { _id: null, total: { $sum: "$quantityInStock" } } },
    ]),
    Batch.findOne({ drug: drug._id, isDeleted: { $ne: true } }).sort({ receivedDate: -1, _id: -1 }),
  ]);
  const stock = totals[0]?.total || 0;
  if (!recentBatch) return [];

  const type = stock === 0 ? "STOCKOUT" : stock <= drug.reorderThreshold ? "LOW_STOCK" : null;
  if (!type) return [];
  const incident = await createIncident({
    type,
    drug: drug._id,
    batch: recentBatch._id,
    supplier: recentBatch.supplier,
    quantityAffected: stock,
    reason: type === "STOCKOUT" ? `${drug.name} has no sellable stock remaining.` : `${drug.name} stock (${stock}) is at or below the reorder threshold (${drug.reorderThreshold}).`,
    reportedBy,
    dedupeKey: `${type}:${drug._id}:${new Date().toISOString().slice(0, 10)}`,
  });
  return [incident];
}
