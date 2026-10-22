import DrugRequest from "../models/DrugRequest.js";
import Supplier from "../models/Supplier.js";
import SupplierInquiry from "../models/SupplierInquiry.js";
import Incident from "../models/Incident.js";
import Notification from "../models/Notification.js";
import Batch from "../models/Batch.js";
import AppError from "../utils/AppError.js";
import { notifySupplier } from "../services/notificationService.js";

export async function createInquiry(req, res) {
  const request = await DrugRequest.findById(req.body.drugRequestId);
  if (!request) throw new AppError("Drug request not found", 404, "NOT_FOUND");
  const suppliers = await Supplier.find({
    _id: { $in: req.body.supplierIds },
    isActive: true,
    isDeleted: { $ne: true },
  }).select("_id");
  if (suppliers.length !== req.body.supplierIds.length) {
    throw new AppError("One or more suppliers are unavailable", 400, "INVALID_SUPPLIER");
  }
  const inquiry = await SupplierInquiry.create({
    drugRequest: request._id,
    drugName: request.drugName,
    quantityNeeded: req.body.quantityNeeded,
    neededBy: req.body.neededBy,
    message: req.body.message,
    createdBy: req.user._id,
    responses: suppliers.map(({ _id }) => ({ supplier: _id, status: "pending" })),
  });
  request.status = "inquiry_sent";
  await request.save();

  await Promise.all(suppliers.map((supplier) => notifySupplier({
    supplierId: supplier._id,
    type: "supplier_inquiry",
    title: `Quote requested: ${inquiry.drugName}`,
    message: `${inquiry.quantityNeeded} units are needed${inquiry.neededBy ? ` by ${inquiry.neededBy.toDateString()}` : ""}. ${inquiry.message || ""}`,
    relatedModel: "SupplierInquiry",
    relatedId: inquiry._id,
  })));
  res.status(201).json(inquiry);
}

export async function listInquiries(req, res) {
  const filter = {};
  if (req.query.drugRequestId) filter.drugRequest = req.query.drugRequestId;
  const inquiries = await SupplierInquiry.find(filter)
    .populate("drugRequest", "drugName status")
    .populate("responses.supplier", "name")
    .populate("chosenSupplier", "name")
    .sort({ createdAt: -1 });
  res.json(inquiries);
}

export async function respondToInquiry(req, res) {
  const response = {
    status: req.body.available ? "available" : "unavailable",
    availableQuantity: req.body.available ? req.body.availableQuantity : 0,
    unitPrice: req.body.available ? req.body.unitPrice : undefined,
    leadTimeDays: req.body.available ? req.body.leadTimeDays : undefined,
    note: req.body.note,
    respondedAt: new Date(),
  };
  const inquiry = await SupplierInquiry.findOneAndUpdate(
    {
      _id: req.params.id,
      status: "open",
      "responses.supplier": req.user.supplier,
    },
    { $set: { "responses.$": { supplier: req.user.supplier, ...response } } },
    { new: true, runValidators: true }
  );
  if (!inquiry) throw new AppError("Open inquiry not found for this supplier", 404, "NOT_FOUND");
  res.json(inquiry);
}

export async function chooseInquirySupplier(req, res) {
  const inquiry = await SupplierInquiry.findOneAndUpdate(
    {
      _id: req.params.id,
      status: "open",
      responses: { $elemMatch: { supplier: req.body.supplierId, status: "available" } },
    },
    { $set: { status: "closed", chosenSupplier: req.body.supplierId } },
    { new: true }
  );
  if (!inquiry) throw new AppError("Inquiry or available supplier response not found", 404, "NOT_FOUND");
  const chosen = inquiry.responses.find((item) => String(item.supplier) === req.body.supplierId);
  await DrugRequest.findByIdAndUpdate(inquiry.drugRequest, { $set: { status: "sourced" } });
  res.json({
    inquiry,
    purchaseOrder: {
      supplier: req.body.supplierId,
      items: [{
        drug: inquiry.drugRequest ? (await DrugRequest.findById(inquiry.drugRequest).select("drug")).drug : undefined,
        quantity: Math.min(inquiry.quantityNeeded, chosen.availableQuantity),
        unitPrice: chosen.unitPrice,
      }],
    },
  });
}

export async function getSupplierInbox(req, res) {
  const supplierId = req.user.supplier;
  const [inquiries, incidents, notifications, batches] = await Promise.all([
    SupplierInquiry.find({ "responses.supplier": supplierId, status: "open" }).sort({ createdAt: -1 }),
    Incident.find({ supplier: supplierId, status: { $ne: "resolved" } }).populate("drug", "name").populate("batch", "batchNumber").sort({ createdAt: -1 }),
    Notification.find({ recipientSupplier: supplierId }).sort({ createdAt: -1 }).limit(50),
    Batch.find({ supplier: supplierId, isDeleted: { $ne: true } })
      .populate("drug", "name unit")
      .sort({ receivedDate: -1 })
      .limit(100),
  ]);
  res.json({ inquiries, incidents, notifications, batches });
}
