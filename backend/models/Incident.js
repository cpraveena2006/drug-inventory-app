import mongoose from "mongoose";
import { INCIDENT_TYPES } from "../constants/statuses.js";

const incidentSchema = new mongoose.Schema(
  {
    type: { type: String, enum: INCIDENT_TYPES, required: true },
    drug: { type: mongoose.Schema.Types.ObjectId, ref: "Drug", required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    quantityAffected: { type: Number, min: 0, default: 0 },
    reason: { type: String, trim: true, required: true },
    severity: { type: String, enum: ["info", "warning", "critical"], required: true },
    status: {
      type: String,
      enum: ["open", "supplier_notified", "acknowledged", "resolved"],
      default: "open",
    },
    reportedBy: mongoose.Schema.Types.Mixed,
    supplierNotifiedAt: Date,
    supplierResponse: { type: String, trim: true },
    resolvedAt: Date,
    dedupeKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

incidentSchema.index({ supplier: 1, status: 1, createdAt: -1 });

export default mongoose.model("Incident", incidentSchema);
