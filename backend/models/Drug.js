import mongoose from "mongoose";

const drugSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    genericName: { type: String, trim: true },
    category: { type: String, trim: true, default: "General" },
    manufacturer: { type: String, trim: true },
    composition: { type: String, trim: true },
    unit: { type: String, default: "strip" }, // strip, bottle, vial, box...
    unitPrice: { type: Number, required: true, min: 0 },
    reorderThreshold: { type: Number, default: 50 }, // low-stock alert level
    requiresPrescription: { type: Boolean, default: false },
  },
  { timestamps: true }
);

drugSchema.index({ name: "text", genericName: "text", category: "text" });

export default mongoose.model("Drug", drugSchema);
