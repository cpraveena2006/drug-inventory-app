import Order from "../models/Order.js";
import Batch from "../models/Batch.js";
import Drug from "../models/Drug.js";
import logAction from "../utils/logAction.js";

// Create a purchase order (drugs ordered FROM a supplier). No stock effect until delivered + received as a batch.
export const createPurchaseOrder = async (req, res) => {
  try {
    const { supplier, items, notes } = req.body;
    if (!supplier || !items?.length) {
      return res.status(400).json({ message: "Supplier and at least one item are required" });
    }
    const order = await Order.create({
      orderType: "purchase",
      supplier,
      items,
      notes,
      createdBy: req.user._id,
    });
    await logAction({
      userId: req.user._id,
      action: "PURCHASE_ORDER_CREATED",
      entityType: "Order",
      entityId: order._id,
    });
    const populated = await order.populate([
      { path: "supplier", select: "name" },
      { path: "items.drug", select: "name unit" },
    ]);
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: "Failed to create purchase order", error: err.message });
  }
};

// Create a dispatch order (drugs going OUT to a buyer). Deducts stock immediately using
// FEFO (first-expiry-first-out) allocation across available batches.
export const createDispatchOrder = async (req, res) => {
  try {
    const { buyerName, items, notes } = req.body;
    if (!buyerName || !items?.length) {
      return res.status(400).json({ message: "Buyer name and at least one item are required" });
    }

    const allocatedItems = [];

    for (const item of items) {
      let remaining = item.quantity;
      const batches = await Batch.find({
        drug: item.drug,
        quantityInStock: { $gt: 0 },
        status: "active",
        expiryDate: { $gt: new Date() },
      }).sort({ expiryDate: 1 }); // earliest expiry first

      const totalAvailable = batches.reduce((sum, b) => sum + b.quantityInStock, 0);
      if (totalAvailable < item.quantity) {
        const drug = await Drug.findById(item.drug);
        return res.status(400).json({
          message: `Insufficient stock for ${drug?.name || "drug"}. Available: ${totalAvailable}, requested: ${item.quantity}`,
        });
      }

      for (const batch of batches) {
        if (remaining <= 0) break;
        const take = Math.min(batch.quantityInStock, remaining);
        batch.quantityInStock -= take;
        if (batch.quantityInStock === 0) batch.status = "depleted";
        await batch.save();
        allocatedItems.push({
          drug: item.drug,
          batch: batch._id,
          quantity: take,
          unitPrice: item.unitPrice,
        });
        remaining -= take;
      }
    }

    const order = await Order.create({
      orderType: "dispatch",
      buyerName,
      items: allocatedItems,
      notes,
      status: "approved",
      createdBy: req.user._id,
    });

    await logAction({
      userId: req.user._id,
      action: "STOCK_DISPATCHED",
      entityType: "Order",
      entityId: order._id,
      details: { buyerName },
    });

    const populated = await order.populate([
      { path: "items.drug", select: "name unit" },
      { path: "items.batch", select: "batchNumber expiryDate" },
    ]);
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: "Failed to create dispatch order", error: err.message });
  }
};

// Receive a purchase order: creates a Batch for each item and marks the order delivered
export const receivePurchaseOrder = async (req, res) => {
  try {
    const { batchDetails } = req.body; // [{ drugId, batchNumber, manufactureDate, expiryDate, warehouseLocation }]
    const order = await Order.findById(req.params.id);
    if (!order || order.orderType !== "purchase") {
      return res.status(404).json({ message: "Purchase order not found" });
    }
    if (order.status === "delivered") {
      return res.status(400).json({ message: "This order has already been received" });
    }

    const createdBatches = [];
    for (const item of order.items) {
      const detail = batchDetails.find((b) => b.drugId === item.drug.toString());
      if (!detail) {
        return res.status(400).json({ message: `Missing batch details for drug ${item.drug}` });
      }
      const batch = await Batch.create({
        drug: item.drug,
        supplier: order.supplier,
        batchNumber: detail.batchNumber,
        manufactureDate: detail.manufactureDate,
        expiryDate: detail.expiryDate,
        quantityReceived: item.quantity,
        quantityInStock: item.quantity,
        warehouseLocation: detail.warehouseLocation || "Main Warehouse",
      });
      createdBatches.push(batch);
    }

    order.status = "delivered";
    await order.save();

    await logAction({
      userId: req.user._id,
      action: "PURCHASE_ORDER_RECEIVED",
      entityType: "Order",
      entityId: order._id,
      details: { batchesCreated: createdBatches.map((b) => b._id) },
    });

    res.json({ order, batches: createdBatches });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "One of the batch numbers already exists for that drug" });
    }
    res.status(400).json({ message: "Failed to receive purchase order", error: err.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["pending", "approved", "shipped", "delivered", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ message: "Order not found" });
    await logAction({
      userId: req.user._id,
      action: "ORDER_STATUS_UPDATED",
      entityType: "Order",
      entityId: order._id,
      details: { status },
    });
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: "Failed to update order status", error: err.message });
  }
};

export const getOrders = async (req, res) => {
  try {
    const { orderType, status } = req.query;
    const filter = {};
    if (orderType) filter.orderType = orderType;
    if (status) filter.status = status;
    const orders = await Order.find(filter)
      .populate("supplier", "name")
      .populate("items.drug", "name unit")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders", error: err.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("supplier")
      .populate("items.drug")
      .populate("items.batch")
      .populate("createdBy", "name email");
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch order", error: err.message });
  }
};
