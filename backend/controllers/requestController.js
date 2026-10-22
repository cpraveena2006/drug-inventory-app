import Drug from "../models/Drug.js";
import DrugRequest from "../models/DrugRequest.js";
import AppError from "../utils/AppError.js";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function createRequest(req, res) {
  const drugName = req.body.drugName.trim().replace(/\s+/g, " ");
  const normalizedName = drugName.toLowerCase();
  const drug = await Drug.findOne({
    name: new RegExp(`^${escapeRegex(drugName)}$`, "i"),
    isDeleted: { $ne: true },
  }).select("_id");
  const entry = {
    customerName: req.body.customerName,
    customerContact: req.body.customerContact,
    quantity: req.body.quantity,
    notes: req.body.notes,
    loggedBy: req.user._id,
  };

  let request = await DrugRequest.findOneAndUpdate(
    { normalizedName, status: "open" },
    {
      $inc: { totalQuantityRequested: req.body.quantity, demandCount: 1 },
      $set: { lastRequestedAt: new Date() },
      $push: { requests: entry },
    },
    { new: true }
  );
  if (!request) {
    try {
      request = await DrugRequest.create({
        drug: drug?._id,
        drugName,
        normalizedName,
        totalQuantityRequested: req.body.quantity,
        demandCount: 1,
        lastRequestedAt: new Date(),
        requests: [entry],
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      request = await DrugRequest.findOneAndUpdate(
        { normalizedName, status: "open" },
        {
          $inc: { totalQuantityRequested: req.body.quantity, demandCount: 1 },
          $set: { lastRequestedAt: new Date() },
          $push: { requests: entry },
        },
        { new: true }
      );
      if (!request) throw error;
    }
  } else if (drug && !request.drug) {
    request.drug = drug._id;
    await request.save();
  }
  res.status(201).json(request);
}

export async function getRequests(req, res) {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.q) filter.drugName = new RegExp(escapeRegex(req.query.q.trim()), "i");
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const [items, total] = await Promise.all([
    DrugRequest.find(filter).populate("drug", "name category").sort({ demandCount: -1, lastRequestedAt: -1 }).skip((page - 1) * limit).limit(limit),
    DrugRequest.countDocuments(filter),
  ]);
  res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
}

export async function getRequest(req, res) {
  const request = await DrugRequest.findById(req.params.id)
    .populate("drug", "name category")
    .populate("requests.loggedBy", "name");
  if (!request) throw new AppError("Drug request not found", 404, "NOT_FOUND");
  res.json(request);
}

export async function updateRequestStatus(req, res) {
  const request = await DrugRequest.findByIdAndUpdate(
    req.params.id,
    { $set: { status: req.body.status } },
    { new: true, runValidators: true }
  );
  if (!request) throw new AppError("Drug request not found", 404, "NOT_FOUND");
  res.json(request);
}

export async function getTopDemand(req, res) {
  const days = Number(req.query.days) === 90 ? 90 : 30;
  const since = new Date();
  since.setDate(since.getDate() - days);
  const items = await DrugRequest.aggregate([
    { $match: { status: { $nin: ["cancelled", "fulfilled"] } } },
    { $unwind: "$requests" },
    { $match: { "requests.requestedAt": { $gte: since } } },
    {
      $group: {
        _id: "$normalizedName",
        drugName: { $first: "$drugName" },
        requestCount: { $sum: 1 },
        quantityRequested: { $sum: "$requests.quantity" },
        lastRequestedAt: { $max: "$requests.requestedAt" },
      },
    },
    { $sort: { requestCount: -1, quantityRequested: -1 } },
    { $limit: 10 },
  ]);
  res.json({ days, items });
}
