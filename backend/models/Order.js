import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    drug: { type: mongoose.Schema.Types.ObjectId, ref: "Drug", required: true },
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" }, // set for dispatch orders once fulfilled
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderType: {
      type: String,
      enum: ["purchase", "dispatch"], // purchase = from supplier into stock; dispatch = out to buyer
      required: true,
    },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" }, // required for purchase orders
    buyerName: { type: String, trim: true }, // for dispatch orders (pharmacy/hospital name)
    items: { type: [orderItemSchema], required: true, validate: (v) => v.length > 0 },
    status: {
      type: String,
      enum: ["pending", "approved", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    totalAmount: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

orderSchema.pre("save", function (next) {
  this.totalAmount = this.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  next();
});

export default mongoose.model("Order", orderSchema);
