import mongoose from "mongoose";

const requestEntrySchema = new mongoose.Schema(
  {
    customerName: { type: String, trim: true },
    customerContact: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    notes: { type: String, trim: true },
    requestedAt: { type: Date, default: Date.now },
    loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { _id: true }
);

const drugRequestSchema = new mongoose.Schema(
  {
    drug: { type: mongoose.Schema.Types.ObjectId, ref: "Drug" },
    drugName: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, lowercase: true, trim: true },
    totalQuantityRequested: { type: Number, min: 0, default: 0 },
    demandCount: { type: Number, min: 0, default: 0 },
    lastRequestedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["open", "inquiry_sent", "sourced", "fulfilled", "cancelled"],
      default: "open",
    },
    requests: { type: [requestEntrySchema], default: [] },
  },
  { timestamps: true }
);

drugRequestSchema.index({ normalizedName: 1, status: 1 });
drugRequestSchema.index(
  { normalizedName: 1 },
  { unique: true, partialFilterExpression: { status: "open" } }
);
drugRequestSchema.index({ demandCount: -1, lastRequestedAt: -1 });

export default mongoose.model("DrugRequest", drugRequestSchema);
