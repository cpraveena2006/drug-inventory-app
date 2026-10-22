import Drug from "../models/Drug.js";
import Batch from "../models/Batch.js";
import logAction from "../utils/logAction.js";
import { paginationSummary, parsePagination } from "../utils/pagination.js";

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
    const pagination = parsePagination(req.query);
    const filter = {};
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = ["name", "genericName", "category", "manufacturer", "composition"]
        .map((field) => ({ [field]: { $regex: escapedSearch, $options: "i" } }));
    }
    if (category) filter.category = category;
    filter.isDeleted = { $ne: true };
    const [total, categories, drugRows] = await Promise.all([
      pagination.requested ? Drug.countDocuments(filter) : Promise.resolve(null),
      pagination.requested ? Drug.distinct("category", { isDeleted: { $ne: true } }) : Promise.resolve(null),
      (pagination.requested
        ? Drug.find(filter).sort({ name: 1, _id: 1 }).skip(pagination.skip).limit(pagination.limit)
        : Drug.find(filter).sort({ name: 1 })),
    ]);
    const drugs = await drugRows;

    // attach live stock totals
    const stockMatch = { status: { $ne: "depleted" }, isDeleted: { $ne: true } };
    if (req.user.role === "supplier") stockMatch.supplier = req.user.supplier;
    const stockAgg = await Batch.aggregate([
      { $match: { ...stockMatch, drug: { $in: drugs.map((drug) => drug._id) } } },
      { $group: { _id: "$drug", totalStock: { $sum: "$quantityInStock" } } },
    ]);
    const stockMap = Object.fromEntries(stockAgg.map((s) => [s._id.toString(), s.totalStock]));

    const enriched = drugs.map((d) => ({
      ...d.toObject(),
      totalStock: stockMap[d._id.toString()] || 0,
      isLowStock: (stockMap[d._id.toString()] || 0) <= d.reorderThreshold,
    }));

    res.json(pagination.requested
      ? { items: enriched, pagination: paginationSummary(pagination.page, pagination.limit, total), categories: categories.filter(Boolean).sort() }
      : enriched);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch drugs", error: err.message });
  }
};

export const getDrugById = async (req, res) => {
  try {
    const drug = await Drug.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!drug) return res.status(404).json({ message: "Drug not found" });
    const batchFilter = { drug: drug._id, isDeleted: { $ne: true } };
    if (req.user.role === "supplier") batchFilter.supplier = req.user.supplier;
    const batches = await Batch.find(batchFilter).populate("supplier", "name");
    res.json({ drug, batches });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch drug", error: err.message });
  }
};

export const updateDrug = async (req, res) => {
  try {
    const drug = await Drug.findOneAndUpdate({ _id: req.params.id, isDeleted: { $ne: true } }, req.body, {
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
    const drug = await Drug.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id } },
      { new: true }
    );
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

export const restoreDrug = async (req, res) => {
  const drug = await Drug.findOneAndUpdate(
    { _id: req.params.id, isDeleted: true },
    { $set: { isDeleted: false }, $unset: { deletedAt: 1, deletedBy: 1 } },
    { new: true }
  );
  if (!drug) return res.status(404).json({ message: "Deleted drug not found" });
  await logAction({ userId: req.user._id, action: "DRUG_RESTORED", entityType: "Drug", entityId: drug._id });
  res.json(drug);
};
