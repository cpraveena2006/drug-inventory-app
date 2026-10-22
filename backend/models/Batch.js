import mongoose from "mongoose";
import { BATCH_STATUSES } from "../constants/statuses.js";

const batchSchema = new mongoose.Schema(
  {
    drug: { type: mongoose.Schema.Types.ObjectId, ref: "Drug", required: true },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    batchNumber: { type: String, required: true, trim: true },
    manufactureDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    quantityReceived: { type: Number, required: true, min: 0 },
    quantityInStock: { type: Number, required: true, min: 0 },
    receivedDate: { type: Date, default: Date.now },
    purchasePrice: { type: Number, min: 0, default: 0 },
    depletedAt: Date,
    quantityDamaged: { type: Number, min: 0, default: 0 },
    quantityExpiredWriteOff: { type: Number, min: 0, default: 0 },
    qualityRating: { type: Number, min: 1, max: 5 },
    qualityNotes: { type: String, trim: true },
    qualityTags: { type: [String], default: [] },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    barcode: { type: String, trim: true, sparse: true },
    warehouseLocation: { type: String, default: "Main Warehouse" },
    status: {
      type: String,
      enum: BATCH_STATUSES,
      default: "active",
    },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: Date,
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// A supplier's batch number should be unique per drug
batchSchema.index({ drug: 1, batchNumber: 1 }, { unique: true });

batchSchema.virtual("isExpired").get(function () {
  if (!this.expiryDate) return undefined;
  return this.expiryDate < new Date();
});

batchSchema.virtual("daysToExpiry").get(function () {
  if (!this.expiryDate) return undefined;
  const diff = this.expiryDate.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

batchSchema.virtual("quantitySold").get(function () {
  if (
    this.quantityReceived == null ||
    this.quantityInStock == null ||
    this.quantityDamaged == null ||
    this.quantityExpiredWriteOff == null
  ) return undefined;
  return Math.max(
    0,
    this.quantityReceived - this.quantityInStock - this.quantityDamaged - this.quantityExpiredWriteOff
  );
});

batchSchema.set("toJSON", { virtuals: true });
batchSchema.set("toObject", { virtuals: true });

export default mongoose.model("Batch", batchSchema);
