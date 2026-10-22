import mongoose from "mongoose";

const responseSchema = new mongoose.Schema(
  {
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", required: true },
    status: { type: String, enum: ["pending", "available", "unavailable"], default: "pending" },
    availableQuantity: { type: Number, min: 0 },
    unitPrice: { type: Number, min: 0 },
    leadTimeDays: { type: Number, min: 0 },
    note: { type: String, trim: true },
    respondedAt: Date,
  },
  { _id: true }
);

const supplierInquirySchema = new mongoose.Schema(
  {
    drugRequest: { type: mongoose.Schema.Types.ObjectId, ref: "DrugRequest", required: true },
    drugName: { type: String, required: true, trim: true },
    quantityNeeded: { type: Number, min: 1, required: true },
    neededBy: Date,
    message: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    chosenSupplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    responses: { type: [responseSchema], default: [] },
  },
  { timestamps: true }
);

supplierInquirySchema.index({ "responses.supplier": 1, status: 1 });

export default mongoose.model("SupplierInquiry", supplierInquirySchema);
