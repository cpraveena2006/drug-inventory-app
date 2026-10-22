import Batch from "../models/Batch.js";
import Drug from "../models/Drug.js";
import Supplier from "../models/Supplier.js";
import logAction from "../utils/logAction.js";
import AppError from "../utils/AppError.js";
import { createIncident } from "../services/incidentService.js";
import { paginationSummary, parsePagination } from "../utils/pagination.js";

// Create a new batch = receiving stock from a supplier
export const createBatch = async (req, res) => {
  try {
    const { drug, supplier, batchNumber, manufactureDate, expiryDate, quantityReceived, warehouseLocation } = req.body;

    const drugExists = await Drug.findById(drug);
    if (!drugExists) return res.status(404).json({ message: "Drug not found" });

    if (new Date(expiryDate) <= new Date(manufactureDate)) {
      return res.status(400).json({ message: "Expiry date must be after manufacture date" });
    }

    const batch = await Batch.create({
      drug,
      supplier,
      batchNumber,
      manufactureDate,
      expiryDate,
      quantityReceived,
      quantityInStock: quantityReceived,
      warehouseLocation: warehouseLocation || "Main Warehouse",
    });

    await logAction({
      userId: req.user._id,
      action: "BATCH_RECEIVED",
      entityType: "Batch",
      entityId: batch._id,
      details: { drug, batchNumber, quantityReceived },
    });

    const populated = await batch.populate([
      { path: "drug", select: "name category" },
      { path: "supplier", select: "name" },
    ]);
    res.status(201).json(populated);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "This batch number already exists for this drug" });
    }
    res.status(400).json({ message: "Failed to create batch", error: err.message });
  }
};

// List batches with optional filters: expiringWithinDays, status, drug, lowStock
export const getBatches = async (req, res) => {
  try {
    const { drug, status, expiringWithinDays, expiryState, search } = req.query;
    const pagination = parsePagination(req.query);
    const baseFilter = { isDeleted: { $ne: true } };
    if (req.user.role === "supplier") baseFilter.supplier = req.user.supplier;
    const filter = { ...baseFilter };
    if (drug) filter.drug = drug;
    if (status) filter.status = status;
    if (search?.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const [drugIds, supplierIds] = await Promise.all([
        Drug.find({ name: { $regex: escapedSearch, $options: "i" } }).distinct("_id"),
        Supplier.find({ name: { $regex: escapedSearch, $options: "i" } }).distinct("_id"),
      ]);
      filter.$or = [
        { batchNumber: { $regex: escapedSearch, $options: "i" } },
        { warehouseLocation: { $regex: escapedSearch, $options: "i" } },
        { drug: { $in: drugIds } },
        { supplier: { $in: supplierIds } },
      ];
    }
    if (expiringWithinDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + Number(expiringWithinDays));
      filter.expiryDate = { $lte: cutoff };
      filter.quantityInStock = { $gt: 0 };
    }
    const now = new Date();
    if (expiryState === "expired") {
      filter.expiryDate = { $lte: now };
      filter.quantityInStock = { $gt: 0 };
    } else if (expiryState === "expiringSoon") {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() + 30);
      filter.expiryDate = { $gt: now, $lte: cutoff };
      filter.quantityInStock = { $gt: 0 };
    } else if (expiryState === "active") {
      filter.status = "active";
    }

    let query = Batch.find(filter)
      .populate("drug", "name category unit")
      .populate("supplier", "name")
      .sort({ expiryDate: 1 });
    if (pagination.requested) query = query.skip(pagination.skip).limit(pagination.limit);
    const [batches, total, counts] = await Promise.all([
      query,
      pagination.requested ? Batch.countDocuments(filter) : Promise.resolve(null),
      pagination.requested ? Promise.all([
        Batch.countDocuments(baseFilter),
        Batch.countDocuments({ ...baseFilter, status: "active" }),
        Batch.countDocuments({ ...baseFilter, expiryDate: { $gt: now, $lte: new Date(now.getTime() + 30 * 86400000) }, quantityInStock: { $gt: 0 } }),
        Batch.countDocuments({ ...baseFilter, expiryDate: { $lte: now }, quantityInStock: { $gt: 0 } }),
      ]) : Promise.resolve(null),
    ]);
    res.json(pagination.requested
      ? {
        items: batches,
        pagination: paginationSummary(pagination.page, pagination.limit, total),
        counts: { all: counts[0], active: counts[1], expiringSoon: counts[2], expired: counts[3] },
      }
      : batches);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch batches", error: err.message });
  }
};

// Full traceability: batch details + drug + supplier in one call
export const getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
      ...(req.user.role === "supplier" ? { supplier: req.user.supplier } : {}),
    })
      .populate("drug")
      .populate("supplier");
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    res.json(batch);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch batch", error: err.message });
  }
};

export const updateBatch = async (req, res) => {
  try {
    const allowedFields = ["warehouseLocation", "status"];
    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const batch = await Batch.findOneAndUpdate({
      _id: req.params.id, isDeleted: { $ne: true },
      ...(req.user.role === "supplier" ? { supplier: req.user.supplier } : {}),
    }, updates, {
      new: true,
      runValidators: true,
    });
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    await logAction({
      userId: req.user._id,
      action: "BATCH_UPDATED",
      entityType: "Batch",
      entityId: batch._id,
      details: updates,
    });
    res.json(batch);
  } catch (err) {
    res.status(400).json({ message: "Failed to update batch", error: err.message });
  }
};

export const deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id } },
      { new: true }
    );
    if (!batch) return res.status(404).json({ message: "Batch not found" });
    await logAction({
      userId: req.user._id,
      action: "BATCH_DELETED",
      entityType: "Batch",
      entityId: batch._id,
    });
    res.json({ message: "Batch deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete batch", error: err.message });
  }
};

// Alerts: expiring soon (default 30 days) and expired batches still in stock
export const getExpiryAlerts = async (req, res) => {
  try {
    const days = Number(req.query.days) || 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const ownershipFilter = req.user.role === "supplier" ? { supplier: req.user.supplier } : {};
    const expiringSoon = await Batch.find({
      ...ownershipFilter,
      isDeleted: { $ne: true },
      expiryDate: { $gte: new Date(), $lte: cutoff },
      quantityInStock: { $gt: 0 },
      isDeleted: { $ne: true },
    })
      .populate("drug", "name")
      .sort({ expiryDate: 1 });

    const expired = await Batch.find({
      ...ownershipFilter,
      isDeleted: { $ne: true },
      expiryDate: { $lt: new Date() },
      quantityInStock: { $gt: 0 },
      isDeleted: { $ne: true },
    })
      .populate("drug", "name")
      .sort({ expiryDate: 1 });

    res.json({ expiringSoon, expired });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch expiry alerts", error: err.message });
  }
};

// Low stock: drugs whose total stock across active batches is at/below reorder threshold
export const getLowStockAlerts = async (req, res) => {
  try {
    const drugs = await Drug.find({ isDeleted: { $ne: true } });
    const results = [];
    const now = new Date();
    for (const drug of drugs) {
      const batchMatch = {
        drug: drug._id,
        status: "active",
        expiryDate: { $gt: now },
        isDeleted: { $ne: true },
      };
      if (req.user.role === "supplier") batchMatch.supplier = req.user.supplier;
      const agg = await Batch.aggregate([
        { $match: batchMatch },
        { $group: { _id: null, total: { $sum: "$quantityInStock" } } },
      ]);
      const total = agg[0]?.total || 0;
      if (total <= drug.reorderThreshold) {
        results.push({ drug: { _id: drug._id, name: drug.name, category: drug.category }, totalStock: total, reorderThreshold: drug.reorderThreshold });
      }
    }
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch low stock alerts", error: err.message });
  }
};

export const reportDamage = async (req, res) => {
  const quantity = Number(req.body.quantity);
  const batch = await Batch.findOneAndUpdate(
    {
      _id: req.params.id,
      isDeleted: { $ne: true },
      status: "active",
      quantityInStock: { $gte: quantity },
      ...(req.user.role === "supplier" ? { supplier: req.user.supplier } : {}),
    },
    {
      $inc: { quantityInStock: -quantity, quantityDamaged: quantity },
      ...(req.body.tags?.length ? { $addToSet: { qualityTags: { $each: req.body.tags } } } : {}),
    },
    { new: true, runValidators: true }
  );
  if (!batch) throw new AppError("Damage quantity exceeds available stock or batch is not accessible", 409, "INSUFFICIENT_STOCK");

  if (batch.quantityInStock === 0) {
    await Batch.updateOne(
      { _id: batch._id, quantityInStock: 0 },
      { $set: { status: "depleted", depletedAt: new Date() } }
    );
    batch.status = "depleted";
    batch.depletedAt = new Date();
  }

  try {
    await createIncident({
      type: "DAMAGED",
      drug: batch.drug,
      batch: batch._id,
      supplier: batch.supplier,
      quantityAffected: quantity,
      reason: req.body.reason,
      reportedBy: req.user._id,
      dedupeKey: req.body.dedupeKey,
    });
    await logAction({
      userId: req.user._id,
      action: "BATCH_DAMAGE_REPORTED",
      entityType: "Batch",
      entityId: batch._id,
      details: { quantity, reason: req.body.reason, tags: req.body.tags || [] },
    });
  } catch (error) {
    await Batch.updateOne(
      { _id: batch._id },
      { $inc: { quantityInStock: quantity, quantityDamaged: -quantity }, $set: { status: "active" }, $unset: { depletedAt: 1 } }
    );
    throw error;
  }
  res.status(201).json({ batch, message: "Damage reported and supplier notified" });
};

export const updateBatchQuality = async (req, res) => {
  const batch = await Batch.findOneAndUpdate(
    {
      _id: req.params.id,
      isDeleted: { $ne: true },
      ...(req.user.role === "supplier" ? { supplier: req.user.supplier } : {}),
    },
    { $set: req.body },
    { new: true, runValidators: true }
  );
  if (!batch) throw new AppError("Batch not found", 404, "NOT_FOUND");
  await logAction({
    userId: req.user._id,
    action: "BATCH_QUALITY_UPDATED",
    entityType: "Batch",
    entityId: batch._id,
    details: req.body,
  });
  res.json(batch);
};

export const restoreBatch = async (req, res) => {
  const batch = await Batch.findOneAndUpdate(
    { _id: req.params.id, isDeleted: true },
    { $set: { isDeleted: false }, $unset: { deletedAt: 1, deletedBy: 1 } },
    { new: true }
  );
  if (!batch) return res.status(404).json({ message: "Deleted batch not found" });
  await logAction({ userId: req.user._id, action: "BATCH_RESTORED", entityType: "Batch", entityId: batch._id });
  res.json(batch);
};
