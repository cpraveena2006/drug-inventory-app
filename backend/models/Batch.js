import mongoose from "mongoose";

const batchSchema = new mongoose.Schema(
  {
    drug: { type: mongoose.Schema.Types.ObjectId, ref: "Drug", required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    batchNumber: { type: String, required: true, trim: true },
    manufactureDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    quantityReceived: { type: Number, required: true, min: 0 },
    quantityInStock: { type: Number, required: true, min: 0 },
    warehouseLocation: { type: String, default: "Main Warehouse" },
    status: {
      type: String,
      enum: ["active", "expired", "recalled", "depleted"],
      default: "active",
    },
  },
  { timestamps: true }
);

// A supplier's batch number should be unique per drug
batchSchema.index({ drug: 1, batchNumber: 1 }, { unique: true });

batchSchema.virtual("isExpired").get(function () {
  return this.expiryDate < new Date();
});

batchSchema.virtual("daysToExpiry").get(function () {
  const diff = this.expiryDate.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

batchSchema.set("toJSON", { virtuals: true });
batchSchema.set("toObject", { virtuals: true });

export default mongoose.model("Batch", batchSchema);
