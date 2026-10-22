import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true }, // e.g. "BATCH_CREATED", "STOCK_DISPATCHED"
    entityType: { type: String, required: true }, // "Drug" | "Batch" | "Order" | "Supplier"
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    details: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model("AuditLog", auditLogSchema);
