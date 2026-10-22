import Drug from "../models/Drug.js";
import Batch from "../models/Batch.js";
import Order from "../models/Order.js";

export async function getReorderSuggestions(req, res) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const drugs = await Drug.find({ isDeleted: { $ne: true } }).sort({ name: 1 });
  const [stockRows, dispatchRows, supplierRows] = await Promise.all([
    Batch.aggregate([
      { $match: { status: "active", isDeleted: { $ne: true }, expiryDate: { $gt: now } } },
      { $group: { _id: "$drug", stock: { $sum: "$quantityInStock" } } },
    ]),
    Order.aggregate([
      { $match: { orderType: "dispatch", createdAt: { $gte: thirtyDaysAgo } } },
      { $unwind: "$items" },
      { $group: { _id: "$items.drug", dispatched: { $sum: "$items.quantity" } } },
    ]),
    Batch.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: {
        _id: { drug: "$drug", supplier: "$supplier" },
        batches: { $sum: 1 },
        units: { $sum: "$quantityReceived" },
        spend: { $sum: { $multiply: ["$quantityReceived", "$purchasePrice"] } },
        ratings: { $avg: "$qualityRating" },
        damage: { $sum: "$quantityDamaged" },
      } },
      { $lookup: { from: "suppliers", localField: "_id.supplier", foreignField: "_id", as: "supplier" } },
      { $unwind: "$supplier" },
      { $match: { "supplier.isDeleted": { $ne: true }, "supplier.isActive": true } },
      { $project: {
        drug: "$_id.drug",
        supplier: { _id: "$supplier._id", name: "$supplier.name", leadTimeDays: "$supplier.leadTimeDays" },
        avgPrice: { $cond: [{ $gt: ["$units", 0] }, { $divide: ["$spend", "$units"] }, 0] },
        avgRating: "$ratings",
        damageRate: { $cond: [{ $gt: ["$units", 0] }, { $multiply: [{ $divide: ["$damage", "$units"] }, 100] }, 0] },
      } },
    ]),
  ]);
  const stock = new Map(stockRows.map((row) => [String(row._id), row.stock]));
  const dispatch = new Map(dispatchRows.map((row) => [String(row._id), row.dispatched]));
  const suggestions = drugs.flatMap((drug) => {
    const currentStock = stock.get(String(drug._id)) || 0;
    if (currentStock > drug.reorderThreshold) return [];
    const avgDailyDispatch = (dispatch.get(String(drug._id)) || 0) / 30;
    const candidates = supplierRows
      .filter((candidate) => String(candidate.drug) === String(drug._id))
      .map((candidate) => ({
        ...candidate,
        score: Math.max(0, Math.min(100, 70 + (candidate.avgRating || 0) * 5 - candidate.damageRate * 0.4)),
      }))
      .sort((left, right) => right.score - left.score || left.avgPrice - right.avgPrice || left.supplier.leadTimeDays - right.supplier.leadTimeDays);
    const best = candidates[0] || null;
    const leadTimeDays = best?.supplier.leadTimeDays || 7;
    const suggestedQuantity = Math.max(0, Math.ceil(avgDailyDispatch * leadTimeDays + drug.reorderThreshold - currentStock));
    return [{
      drug: { _id: drug._id, name: drug.name, reorderThreshold: drug.reorderThreshold },
      currentStock,
      avgDailyDispatch,
      suggestedQuantity,
      bestSupplier: best ? { ...best.supplier, avgPrice: best.avgPrice, score: best.score } : null,
    }];
  });
  res.json(suggestions);
}
