import Batch from "../models/Batch.js";
import Drug from "../models/Drug.js";
import logAction from "../utils/logAction.js";

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
    const { drug, status, expiringWithinDays } = req.query;
    const filter = {};
    if (drug) filter.drug = drug;
    if (status) filter.status = status;
    if (expiringWithinDays) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + Number(expiringWithinDays));
      filter.expiryDate = { $lte: cutoff };
      filter.quantityInStock = { $gt: 0 };
    }

    const batches = await Batch.find(filter)
      .populate("drug", "name category unit")
      .populate("supplier", "name")
      .sort({ expiryDate: 1 });

    res.json(batches);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch batches", error: err.message });
  }
};

// Full traceability: batch details + drug + supplier in one call
export const getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
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
    const batch = await Batch.findByIdAndUpdate(req.params.id, updates, {
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
    const batch = await Batch.findByIdAndDelete(req.params.id);
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

    const expiringSoon = await Batch.find({
      expiryDate: { $gte: new Date(), $lte: cutoff },
      quantityInStock: { $gt: 0 },
    })
      .populate("drug", "name")
      .sort({ expiryDate: 1 });

    const expired = await Batch.find({
      expiryDate: { $lt: new Date() },
      quantityInStock: { $gt: 0 },
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
    const drugs = await Drug.find();
    const results = [];
    for (const drug of drugs) {
      const agg = await Batch.aggregate([
        { $match: { drug: drug._id, status: { $ne: "depleted" } } },
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
