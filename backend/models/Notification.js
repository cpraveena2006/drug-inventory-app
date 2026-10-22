import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientSupplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
    recipientUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    channel: { type: String, enum: ["in_app", "email"], default: "in_app" },
    type: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    relatedModel: String,
    relatedId: mongoose.Schema.Types.ObjectId,
    readAt: Date,
    emailStatus: { type: String, enum: ["not_sent", "sent", "failed"], default: "not_sent" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ recipientSupplier: 1, createdAt: -1 });
notificationSchema.index({ recipientUser: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
