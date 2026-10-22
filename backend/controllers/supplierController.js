import Supplier from "../models/Supplier.js";
import logAction from "../utils/logAction.js";

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
    const suppliers = await Supplier.find().sort({ name: 1 });
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch suppliers", error: err.message });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, {
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
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
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
