import Batch from "../models/Batch.js";
import Drug from "../models/Drug.js";
import Order from "../models/Order.js";
import Notification from "../models/Notification.js";
import Incident from "../models/Incident.js";
import AppError from "../utils/AppError.js";
import logAction from "../utils/logAction.js";
import { checkDrugStock } from "./incidentService.js";

export async function createDispatch({ buyerName, items, notes, userId }) {
  const allocations = [];
  const allocatedItems = [];
  const drugIds = [...new Set(items.map((item) => String(item.drug)))];
  let createdOrder;
  try {
    for (const item of items) {
      let remaining = Number(item.quantity);
      while (remaining > 0) {
        const now = new Date();
        const candidate = await Batch.findOne({
          drug: item.drug,
          quantityInStock: { $gt: 0 },
          status: "active",
          isDeleted: { $ne: true },
          expiryDate: { $gt: now },
        }).sort({ expiryDate: 1, _id: 1 });

        if (!candidate) {
          const drug = await Drug.findById(item.drug).select("name");
          const available = Number(item.quantity) - remaining;
          throw new AppError(
            `Insufficient stock for ${drug?.name || "drug"}. Available: ${available}, requested: ${item.quantity}`,
            409,
            "INSUFFICIENT_STOCK"
          );
        }

        const take = Math.min(candidate.quantityInStock, remaining);
        const updated = await Batch.findOneAndUpdate(
          {
            _id: candidate._id,
            status: "active",
            quantityInStock: { $gte: take },
            expiryDate: { $gt: now },
          },
          { $inc: { quantityInStock: -take } },
          { new: true }
        );
        if (!updated) continue;
        if (updated.quantityInStock === 0) {
          await Batch.updateOne(
            { _id: updated._id, quantityInStock: 0 },
            { $set: { status: "depleted", depletedAt: new Date() } }
          );
        }
        allocations.push({ batchId: updated._id, quantity: take });
        allocatedItems.push({
          drug: item.drug,
          batch: updated._id,
          quantity: take,
          unitPrice: Number(item.unitPrice),
        });
        remaining -= take;
      }
    }

    createdOrder = await Order.create({
      orderType: "dispatch",
      buyerName,
      items: allocatedItems,
      notes,
      status: "approved",
      createdBy: userId,
    });
    for (const drugId of drugIds) await checkDrugStock(drugId, userId);
    await logAction({
      userId,
      action: "STOCK_DISPATCHED",
      entityType: "Order",
      entityId: createdOrder._id,
      details: { buyerName },
    });
    return createdOrder;
  } catch (error) {
    if (createdOrder) {
      const incidentIds = await Incident.find({
        drug: { $in: drugIds },
        createdAt: { $gte: createdOrder.createdAt },
        reportedBy: userId,
        type: { $in: ["STOCKOUT", "LOW_STOCK"] },
      }).distinct("_id");
      await Notification.deleteMany({ relatedModel: "Incident", relatedId: { $in: incidentIds } });
      await Incident.deleteMany({ _id: { $in: incidentIds } });
      await createdOrder.deleteOne();
    }
    for (const allocation of allocations) {
      await Batch.updateOne(
        { _id: allocation.batchId },
        {
          $inc: { quantityInStock: allocation.quantity },
          $set: { status: "active" },
          $unset: { depletedAt: 1 },
        }
      );
    }
    throw error;
  }
}
