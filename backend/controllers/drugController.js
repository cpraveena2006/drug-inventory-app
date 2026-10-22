import Drug from "../models/Drug.js";
import Batch from "../models/Batch.js";
import logAction from "../utils/logAction.js";

export const createDrug = async (req, res) => {
  try {
    const drug = await Drug.create(req.body);
    await logAction({
      userId: req.user._id,
      action: "DRUG_CREATED",
      entityType: "Drug",
      entityId: drug._id,
      details: { name: drug.name },
    });
    res.status(201).json(drug);
  } catch (err) {
    res.status(400).json({ message: "Failed to create drug", error: err.message });
  }
};

export const getDrugs = async (req, res) => {
  try {
    const { search, category } = req.query;
    const filter = {};
    if (search) filter.$text = { $search: search };
    if (category) filter.category = category;
    const drugs = await Drug.find(filter).sort({ name: 1 });

    // attach live stock totals
    const stockAgg = await Batch.aggregate([
      { $match: { status: { $ne: "depleted" } } },
      { $group: { _id: "$drug", totalStock: { $sum: "$quantityInStock" } } },
    ]);
    const stockMap = Object.fromEntries(stockAgg.map((s) => [s._id.toString(), s.totalStock]));

    const enriched = drugs.map((d) => ({
      ...d.toObject(),
      totalStock: stockMap[d._id.toString()] || 0,
      isLowStock: (stockMap[d._id.toString()] || 0) <= d.reorderThreshold,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch drugs", error: err.message });
  }
};

export const getDrugById = async (req, res) => {
  try {
    const drug = await Drug.findById(req.params.id);
    if (!drug) return res.status(404).json({ message: "Drug not found" });
    const batches = await Batch.find({ drug: drug._id }).populate("supplier", "name");
    res.json({ drug, batches });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch drug", error: err.message });
  }
};

export const updateDrug = async (req, res) => {
  try {
    const drug = await Drug.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!drug) return res.status(404).json({ message: "Drug not found" });
    await logAction({
      userId: req.user._id,
      action: "DRUG_UPDATED",
      entityType: "Drug",
      entityId: drug._id,
      details: req.body,
    });
    res.json(drug);
  } catch (err) {
    res.status(400).json({ message: "Failed to update drug", error: err.message });
  }
};

export const deleteDrug = async (req, res) => {
  try {
    const activeBatches = await Batch.countDocuments({
      drug: req.params.id,
      quantityInStock: { $gt: 0 },
    });
    if (activeBatches > 0) {
      return res.status(400).json({
        message: "Cannot delete a drug with active stock. Deplete or transfer batches first.",
      });
    }
    const drug = await Drug.findByIdAndDelete(req.params.id);
    if (!drug) return res.status(404).json({ message: "Drug not found" });
    await logAction({
      userId: req.user._id,
      action: "DRUG_DELETED",
      entityType: "Drug",
      entityId: drug._id,
    });
    res.json({ message: "Drug deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete drug", error: err.message });
  }
};
