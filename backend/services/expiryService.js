import Batch from "../models/Batch.js";
import { createIncident } from "./incidentService.js";

export async function runExpiryCheck(reportedBy) {
  const now = new Date();
  const nearExpiryEnd = new Date(now);
  nearExpiryEnd.setDate(nearExpiryEnd.getDate() + 30);
  const expiring = await Batch.find({
    isDeleted: { $ne: true },
    expiryDate: { $lte: nearExpiryEnd },
    quantityInStock: { $gt: 0 },
    status: { $in: ["active", "expired"] },
  }).populate("drug", "name");

  const incidents = [];
  for (const batch of expiring) {
    if (batch.expiryDate <= now && batch.status !== "expired") {
      batch.status = "expired";
      await batch.save();
    }
    const type = batch.expiryDate <= now ? "EXPIRED" : "NEAR_EXPIRY";
    const incident = await createIncident({
      type,
      drug: batch.drug._id,
      batch: batch._id,
      supplier: batch.supplier,
      quantityAffected: batch.quantityInStock,
      reason: type === "EXPIRED"
        ? `Batch ${batch.batchNumber} of ${batch.drug.name} expired on ${batch.expiryDate.toISOString()}.`
        : `Batch ${batch.batchNumber} of ${batch.drug.name} expires on ${batch.expiryDate.toISOString()}.`,
      reportedBy,
      dedupeKey: `${type}:${batch._id}:${batch.expiryDate.toISOString().slice(0, 10)}`,
    });
    incidents.push(incident);
  }
  return { checked: expiring.length, incidents };
}
