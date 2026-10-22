import Supplier from "../models/Supplier.js";
import logAction from "../utils/logAction.js";
import { paginationSummary, parsePagination } from "../utils/pagination.js";

export const createSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.create(req.body);
    await logAction({
      userId: req.user._id,
      action: "SUPPLIER_CREATED",
      entityType: "Supplier",
      entityId: supplier._id,
      details: { name: supplier.name },
    });
    res.status(201).json(supplier);
  } catch (err) {
    res.status(400).json({ message: "Failed to create supplier", error: err.message });
  }
};

export const getSuppliers = async (req, res) => {
  try {
    const { search } = req.query;
    const pagination = parsePagination(req.query);
    const filter = { isDeleted: { $ne: true } };
    if (req.user.role === "supplier") filter._id = req.user.supplier;
    if (search?.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = ["name", "contactPerson", "email", "phone", "address"]
        .map((field) => ({ [field]: { $regex: escapedSearch, $options: "i" } }));
    }
    let query = Supplier.find(filter).sort({ name: 1, _id: 1 });
    if (pagination.requested) query = query.skip(pagination.skip).limit(pagination.limit);
    const [suppliers, total] = await Promise.all([
      query,
      pagination.requested ? Supplier.countDocuments(filter) : Promise.resolve(null),
    ]);
    res.json(pagination.requested
      ? { items: suppliers, pagination: paginationSummary(pagination.page, pagination.limit, total) }
      : suppliers);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch suppliers", error: err.message });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate({
      _id: req.params.id, isDeleted: { $ne: true },
      ...(req.user.role === "supplier" ? { _id: req.user.supplier } : {}),
    }, req.body, {
      new: true,
      runValidators: true,
    });
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    res.json(supplier);
  } catch (err) {
    res.status(400).json({ message: "Failed to update supplier", error: err.message });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id } },
      { new: true }
    );
    if (!supplier) return res.status(404).json({ message: "Supplier not found" });
    await logAction({
      userId: req.user._id,
      action: "SUPPLIER_DELETED",
      entityType: "Supplier",
      entityId: supplier._id,
    });
    res.json({ message: "Supplier deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete supplier", error: err.message });
  }
};

export const restoreSupplier = async (req, res) => {
  const supplier = await Supplier.findOneAndUpdate(
    { _id: req.params.id, isDeleted: true },
    { $set: { isDeleted: false }, $unset: { deletedAt: 1, deletedBy: 1 } },
    { new: true }
  );
  if (!supplier) return res.status(404).json({ message: "Deleted supplier not found" });
  await logAction({ userId: req.user._id, action: "SUPPLIER_RESTORED", entityType: "Supplier", entityId: supplier._id });
  res.json(supplier);
};
