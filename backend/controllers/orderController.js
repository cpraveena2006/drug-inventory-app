import Order from "../models/Order.js";
import Batch from "../models/Batch.js";
import Drug from "../models/Drug.js";
import Supplier from "../models/Supplier.js";
import mongoose from "mongoose";
import logAction from "../utils/logAction.js";
import { createDispatch } from "../services/dispatchService.js";
import { paginationSummary, parsePagination } from "../utils/pagination.js";

// Create a purchase order (drugs ordered FROM a supplier). No stock effect until delivered + received as a batch.
export const createPurchaseOrder = async (req, res) => {
  try {
    const { supplier, items, notes, expectedDeliveryDate } = req.body;
    if (!supplier || !items?.length) {
      return res.status(400).json({ message: "Supplier and at least one item are required" });
    }
    const order = await Order.create({
      orderType: "purchase",
      supplier,
      items,
      notes,
      expectedDeliveryDate,
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
    const order = await createDispatch({ buyerName, items, notes, userId: req.user._id });

    const populated = await order.populate([
      { path: "items.drug", select: "name unit" },
      { path: "items.batch", select: "batchNumber expiryDate" },
    ]);
    return res.status(201).json(populated);
  } catch (err) {
    return res.status(err.statusCode || 400).json({
      message: err.message || "Failed to create dispatch order",
      code: err.code || "DISPATCH_FAILED",
    });
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
        receivedDate: new Date(),
        purchasePrice: item.unitPrice,
        purchaseOrder: order._id,
        warehouseLocation: detail.warehouseLocation || "Main Warehouse",
      });
      createdBatches.push(batch);
    }

    order.status = "delivered";
    order.receivedAt = new Date();
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
    const { orderType, status, search } = req.query;
    const pagination = parsePagination(req.query);
    const baseFilter = {};
    if (req.user.role === "supplier") baseFilter.supplier = req.user.supplier;
    if (search?.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const [drugIds, supplierIds] = await Promise.all([
        Drug.find({ name: { $regex: escapedSearch, $options: "i" } }).distinct("_id"),
        Supplier.find({ name: { $regex: escapedSearch, $options: "i" } }).distinct("_id"),
      ]);
      baseFilter.$or = [
        { buyerName: { $regex: escapedSearch, $options: "i" } },
        { notes: { $regex: escapedSearch, $options: "i" } },
        { orderType: { $regex: escapedSearch, $options: "i" } },
        { status: { $regex: escapedSearch, $options: "i" } },
        { "items.drug": { $in: drugIds } },
        { supplier: { $in: supplierIds } },
      ];
      if (mongoose.Types.ObjectId.isValid(search)) {
        baseFilter.$or.push({ _id: new mongoose.Types.ObjectId(search) });
      }
    }
    const filter = { ...baseFilter };
    if (orderType) filter.orderType = orderType;
    if (status) filter.status = status;
    let query = Order.find(filter)
      .populate("supplier", "name")
      .populate("items.drug", "name unit")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });
    if (pagination.requested) query = query.skip(pagination.skip).limit(pagination.limit);
    const [orders, total, counts] = await Promise.all([
      query,
      pagination.requested ? Order.countDocuments(filter) : Promise.resolve(null),
      pagination.requested ? Promise.all([
        Order.countDocuments({ ...baseFilter, orderType: "purchase" }),
        Order.countDocuments({ ...baseFilter, orderType: "dispatch" }),
        Order.countDocuments(baseFilter),
      ]) : Promise.resolve(null),
    ]);
    res.json(pagination.requested
      ? {
        items: orders,
        pagination: paginationSummary(pagination.page, pagination.limit, total),
        counts: { all: counts[2], purchase: counts[0], dispatch: counts[1] },
      }
      : orders);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders", error: err.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      ...(req.user.role === "supplier" ? { supplier: req.user.supplier } : {}),
    })
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
