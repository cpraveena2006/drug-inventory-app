import mongoose from "mongoose";
import Batch from "../models/Batch.js";
import Drug from "../models/Drug.js";
import Order from "../models/Order.js";
import Incident from "../models/Incident.js";
import DrugRequest from "../models/DrugRequest.js";
import Supplier from "../models/Supplier.js";
import AuditLog from "../models/AuditLog.js";
import AppError from "../utils/AppError.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const percent = (part, total) => total ? (part / total) * 100 : 0;

export async function getDrugInsights(req, res) {
  const drug = await Drug.findOne({
    _id: req.params.id,
    isDeleted: { $ne: true },
  });
  if (!drug) throw new AppError("Drug not found", 404, "NOT_FOUND");

  const now = new Date();
  const since30Days = new Date(now.getTime() - 30 * DAY_MS);
  const [batches, currentStockRows, dispatchByBatch, recentDispatch, incidentCount, demandRows, supplierLeadTimes] = await Promise.all([
    Batch.find({ drug: drug._id, isDeleted: { $ne: true } })
      .populate("supplier", "name leadTimeDays")
      .sort({ receivedDate: -1, _id: -1 }),
    Batch.aggregate([
      { $match: { drug: drug._id, status: "active", isDeleted: { $ne: true }, expiryDate: { $gt: now } } },
      { $group: { _id: null, total: { $sum: "$quantityInStock" } } },
    ]),
    Order.aggregate([
      { $match: { orderType: "dispatch" } },
      { $unwind: "$items" },
      { $match: { "items.drug": drug._id, "items.batch": { $ne: null } } },
      { $group: { _id: "$items.batch", quantity: { $sum: "$items.quantity" } } },
    ]),
    Order.aggregate([
      { $match: { orderType: "dispatch", createdAt: { $gte: since30Days } } },
      { $unwind: "$items" },
      { $match: { "items.drug": drug._id } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, quantity: { $sum: "$items.quantity" } } },
      { $sort: { _id: 1 } },
    ]),
    Incident.countDocuments({ drug: drug._id }),
    DrugRequest.aggregate([
      { $match: { drug: drug._id, status: { $nin: ["cancelled", "fulfilled"] } } },
      { $group: { _id: null, count: { $sum: "$demandCount" }, quantity: { $sum: "$totalQuantityRequested" } } },
    ]),
    Order.aggregate([
      { $match: { orderType: "purchase", supplier: { $ne: null }, receivedAt: { $ne: null } } },
      { $unwind: "$items" },
      { $match: { "items.drug": drug._id } },
      { $group: { _id: "$supplier", leadTime: { $avg: { $divide: [{ $subtract: ["$receivedAt", "$createdAt"] }, DAY_MS] } } } },
    ]),
  ]);
  const soldByBatch = new Map(dispatchByBatch.map((row) => [String(row._id), row.quantity]));
  const receivedTotal = batches.reduce((total, batch) => total + batch.quantityReceived, 0);
  const damagedTotal = batches.reduce((total, batch) => total + batch.quantityDamaged, 0);
  const expiredTotal = batches.reduce((total, batch) => total + batch.quantityExpiredWriteOff, 0);
  const soldTotal = batches.reduce((total, batch) => total + (soldByBatch.get(String(batch._id)) ?? batch.quantitySold), 0);
  const totalDispatchLast30Days = recentDispatch.reduce((total, day) => total + day.quantity, 0);
  const avgDailyDispatchLast30Days = totalDispatchLast30Days / 30;
  const perBatch = batches.map((batch) => {
    const soldQty = soldByBatch.get(String(batch._id)) ?? batch.quantitySold;
    const elapsedDays = Math.max(1, (now - batch.receivedDate) / DAY_MS);
    const daysToSell = batch.depletedAt
      ? Math.max(0, (batch.depletedAt - batch.receivedDate) / DAY_MS)
      : soldQty > 0 ? (elapsedDays * batch.quantityReceived) / soldQty : null;
    return { batchNumber: batch.batchNumber, daysToSell, soldQty };
  });
  const sellTimes = perBatch.map((batch) => batch.daysToSell).filter(Number.isFinite);
  const supplierLeadTimeById = new Map(supplierLeadTimes.map((item) => [String(item._id), item.leadTime]));
  const supplierGroups = new Map();
  for (const batch of batches) {
    const key = String(batch.supplier?._id || batch.supplier);
    if (!supplierGroups.has(key)) supplierGroups.set(key, {
      supplier: batch.supplier,
      batches: 0,
      unitsBought: 0,
      cost: 0,
      ratings: [],
      damaged: 0,
      daysToSell: [],
    });
    const group = supplierGroups.get(key);
    group.batches += 1;
    group.unitsBought += batch.quantityReceived;
    group.cost += batch.quantityReceived * (batch.purchasePrice || 0);
    if (batch.qualityRating) group.ratings.push(batch.qualityRating);
    group.damaged += batch.quantityDamaged;
    const days = perBatch.find((entry) => entry.batchNumber === batch.batchNumber)?.daysToSell;
    if (Number.isFinite(days)) group.daysToSell.push(days);
  }

  res.json({
    drug,
    currentStock: currentStockRows[0]?.total || 0,
    purchaseHistory: batches.map((batch) => ({
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      supplier: batch.supplier,
      receivedDate: batch.receivedDate,
      quantityReceived: batch.quantityReceived,
      purchasePrice: batch.purchasePrice,
      expiryDate: batch.expiryDate,
      status: batch.status,
    })),
    lastPurchase: batches[0] ? {
      supplier: batches[0].supplier,
      date: batches[0].receivedDate,
      quantity: batches[0].quantityReceived,
      price: batches[0].purchasePrice,
    } : null,
    salesPerformance: {
      avgDaysToSell: sellTimes.length ? sellTimes.reduce((sum, value) => sum + value, 0) / sellTimes.length : null,
      fastestDays: sellTimes.length ? Math.min(...sellTimes) : null,
      slowestDays: sellTimes.length ? Math.max(...sellTimes) : null,
      sellThroughRate: percent(soldTotal, receivedTotal),
      avgDailyDispatchLast30Days,
      dispatchTrend: recentDispatch.map((day) => ({ date: day._id, quantity: day.quantity })),
      estimatedDaysUntilStockout: avgDailyDispatchLast30Days ? (currentStockRows[0]?.total || 0) / avgDailyDispatchLast30Days : null,
      perBatch,
    },
    quality: {
      avgRating: batches.filter((batch) => batch.qualityRating).length
        ? batches.reduce((sum, batch) => sum + (batch.qualityRating || 0), 0) / batches.filter((batch) => batch.qualityRating).length
        : null,
      ratingsCount: batches.filter((batch) => batch.qualityRating).length,
      damageRate: percent(damagedTotal, receivedTotal),
      expiredWriteOffRate: percent(expiredTotal, receivedTotal),
      incidentCount,
      commonTags: [...new Set(batches.flatMap((batch) => batch.qualityTags || []))],
    },
    supplierComparison: [...supplierGroups.values()].map((group) => ({
      supplier: group.supplier,
      batches: group.batches,
      unitsBought: group.unitsBought,
      avgPurchasePrice: group.unitsBought ? group.cost / group.unitsBought : 0,
      avgLeadTimeDays: supplierLeadTimeById.get(String(group.supplier?._id || group.supplier)) ?? group.supplier?.leadTimeDays ?? null,
      avgRating: group.ratings.length ? group.ratings.reduce((sum, value) => sum + value, 0) / group.ratings.length : null,
      damageRate: percent(group.damaged, group.unitsBought),
      avgDaysToSell: group.daysToSell.length ? group.daysToSell.reduce((sum, value) => sum + value, 0) / group.daysToSell.length : null,
    })),
    demand: {
      unavailableRequestsCount: demandRows[0]?.count || 0,
      totalUnitsRequested: demandRows[0]?.quantity || 0,
    },
  });
}

export async function getBatchDetails(req, res) {
  const batchId = new mongoose.Types.ObjectId(req.params.id);
  const batchFilter = {
    _id: batchId,
    isDeleted: { $ne: true },
    ...(req.user.role === "supplier" ? { supplier: req.user.supplier } : {}),
  };
  const batch = await Batch.findOne(batchFilter).populate("drug").populate("supplier");
  if (!batch) throw new AppError("Batch not found", 404, "NOT_FOUND");
  const [supplierTotals, supplierDrugTotals, supplierAllTotals, dispatchHistory, incidents, auditEvents] = await Promise.all([
    Batch.aggregate([
      { $match: { supplier: batch.supplier._id, isDeleted: { $ne: true } } },
      { $count: "totalBatches" },
    ]),
    Batch.aggregate([
      { $match: { supplier: batch.supplier._id, isDeleted: { $ne: true } } },
      { $group: { _id: "$drug", units: { $sum: "$quantityReceived" } } },
    ]),
    Batch.aggregate([
      { $match: { supplier: batch.supplier._id, isDeleted: { $ne: true } } },
      { $group: { _id: null, units: { $sum: "$quantityReceived" } } },
    ]),
    Order.aggregate([
      { $match: { orderType: "dispatch" } },
      { $unwind: "$items" },
      { $match: { "items.batch": batchId } },
      { $project: { buyerName: 1, date: "$createdAt", quantity: "$items.quantity" } },
      { $sort: { date: 1 } },
    ]),
    Incident.find({ batch: batchId }).sort({ createdAt: -1 }),
    AuditLog.find({ entityType: "Batch", entityId: batchId }).sort({ createdAt: 1 }),
  ]);
  const drugSupplierUnits = supplierDrugTotals.find((item) => String(item._id) === String(batch.drug._id))?.units || 0;
  const dispatched = dispatchHistory.reduce((sum, event) => sum + event.quantity, 0);
  const timeline = [
    { type: "received", date: batch.receivedDate, quantity: batch.quantityReceived },
    ...dispatchHistory.map((event) => ({ type: "dispatch", date: event.date, quantity: event.quantity, buyerName: event.buyerName })),
    ...auditEvents.filter((event) => event.action === "BATCH_DAMAGE_REPORTED").map((event) => ({
      type: "damage", date: event.createdAt, quantity: event.details?.quantity, reason: event.details?.reason,
    })),
    ...(batch.status === "expired" ? [{ type: "expiry", date: batch.expiryDate }] : []),
    ...(batch.qualityRating ? [{ type: "quality", date: batch.updatedAt, rating: batch.qualityRating }] : []),
  ].sort((left, right) => new Date(left.date) - new Date(right.date));
  res.json({
    batch,
    drug: batch.drug,
    supplier: batch.supplier,
    quantityBreakdown: {
      received: batch.quantityReceived,
      dispatched,
      damaged: batch.quantityDamaged,
      expiredWriteOff: batch.quantityExpiredWriteOff,
      inStock: batch.quantityInStock,
    },
    supplierTotals: {
      totalBatchesFromSupplier: supplierTotals[0]?.totalBatches || 0,
      totalUnitsFromSupplierForThisDrug: drugSupplierUnits,
      totalUnitsFromSupplierAllDrugs: supplierAllTotals[0]?.units || 0,
    },
    dispatchHistory,
    incidents,
    timeline,
  });
}

export async function getSupplierScorecard(req, res) {
  const supplierId = req.user.role === "supplier" ? req.user.supplier : req.params.id;
  const supplier = await Supplier.findOne({ _id: supplierId, isDeleted: { $ne: true } });
  if (!supplier) throw new AppError("Supplier not found", 404, "NOT_FOUND");
  const [batchTotals, orderTotals, incidentCount] = await Promise.all([
    Batch.aggregate([
      { $match: { supplier: supplier._id, isDeleted: { $ne: true } } },
      {
        $group: {
          _id: null,
          batches: { $sum: 1 },
          unitsBought: { $sum: "$quantityReceived" },
          spend: { $sum: { $multiply: ["$quantityReceived", "$purchasePrice"] } },
          ratedCount: { $sum: { $cond: [{ $gt: ["$qualityRating", 0] }, 1, 0] } },
          ratingTotal: { $sum: { $ifNull: ["$qualityRating", 0] } },
          damaged: { $sum: "$quantityDamaged" },
          expired: { $sum: "$quantityExpiredWriteOff" },
        },
      },
    ]),
    Order.aggregate([
      { $match: { supplier: supplier._id, orderType: "purchase", receivedAt: { $ne: null } } },
      {
        $group: {
          _id: null,
          avgLeadTimeDays: { $avg: { $divide: [{ $subtract: ["$receivedAt", "$createdAt"] }, DAY_MS] } },
          receivedOrders: { $sum: 1 },
          onTimeOrders: {
            $sum: {
              $cond: [
                { $or: [{ $eq: ["$expectedDeliveryDate", null] }, { $lte: ["$receivedAt", "$expectedDeliveryDate"] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    Incident.countDocuments({ supplier: supplier._id, status: { $ne: "resolved" } }),
  ]);
  const totals = batchTotals[0] || { batches: 0, unitsBought: 0, spend: 0, ratedCount: 0, ratingTotal: 0, damaged: 0, expired: 0 };
  const orders = orderTotals[0] || { avgLeadTimeDays: null, receivedOrders: 0, onTimeOrders: 0 };
  const damageRate = percent(totals.damaged, totals.unitsBought);
  const expiredRate = percent(totals.expired, totals.unitsBought);
  const onTimeRate = orders.receivedOrders ? percent(orders.onTimeOrders, orders.receivedOrders) : 100;
  const openIncidents = incidentCount;
  // Reliability = 100 minus late-delivery (30%), damage (40%), expiry (20%), and open-incident (up to 10) penalties.
  const reliabilityScore = Math.max(0, Math.min(100,
    100 - ((100 - onTimeRate) * 0.3) - (damageRate * 0.4) - (expiredRate * 0.2) - Math.min(10, openIncidents * 2)
  ));
  res.json({
    supplier,
    totals: {
      batches: totals.batches,
      spend: totals.spend,
      unitsBought: totals.unitsBought,
      avgLeadTimeDays: orders.avgLeadTimeDays,
      onTimeDeliveryRate: onTimeRate,
      avgQualityRating: totals.ratedCount ? totals.ratingTotal / totals.ratedCount : null,
      damageRate,
      expiredRate,
      openIncidents,
      reliabilityScore,
    },
  });
}

export async function getSupplierLeaderboard(req, res) {
  const supplierFilter = req.user.role === "supplier" ? { _id: req.user.supplier } : {};
  const [suppliers, batches, deliveries, incidents] = await Promise.all([
    Supplier.find({ ...supplierFilter, isActive: true, isDeleted: { $ne: true } }).select("name leadTimeDays"),
    Batch.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: {
        _id: "$supplier",
        units: { $sum: "$quantityReceived" },
        spend: { $sum: { $multiply: ["$quantityReceived", "$purchasePrice"] } },
        damage: { $sum: "$quantityDamaged" },
        expired: { $sum: "$quantityExpiredWriteOff" },
        ratingTotal: { $sum: { $ifNull: ["$qualityRating", 0] } },
        ratingCount: { $sum: { $cond: [{ $gt: ["$qualityRating", 0] }, 1, 0] } },
      } },
    ]),
    Order.aggregate([
      { $match: { orderType: "purchase", receivedAt: { $ne: null } } },
      { $group: {
        _id: "$supplier",
        received: { $sum: 1 },
        onTime: { $sum: { $cond: [{ $or: [{ $eq: ["$expectedDeliveryDate", null] }, { $lte: ["$receivedAt", "$expectedDeliveryDate"] }] }, 1, 0] } },
        leadTime: { $avg: { $divide: [{ $subtract: ["$receivedAt", "$createdAt"] }, DAY_MS] } },
      } },
    ]),
    Incident.aggregate([
      { $match: { status: { $ne: "resolved" } } },
      { $group: { _id: "$supplier", openIncidents: { $sum: 1 } } },
    ]),
  ]);
  const batchMap = new Map(batches.map((item) => [String(item._id), item]));
  const deliveryMap = new Map(deliveries.map((item) => [String(item._id), item]));
  const incidentMap = new Map(incidents.map((item) => [String(item._id), item.openIncidents]));
  const leaderboard = suppliers.map((supplier) => {
    const batch = batchMap.get(String(supplier._id)) || { units: 0, spend: 0, damage: 0, expired: 0, ratingTotal: 0, ratingCount: 0 };
    const delivery = deliveryMap.get(String(supplier._id)) || { received: 0, onTime: 0, leadTime: null };
    const openIncidents = incidentMap.get(String(supplier._id)) || 0;
    const damageRate = percent(batch.damage, batch.units);
    const expiredRate = percent(batch.expired, batch.units);
    const onTimeRate = delivery.received ? percent(delivery.onTime, delivery.received) : 100;
    // Reliability = 100 minus late-delivery (30%), damage (40%), expiry (20%), and open-incident (up to 10) penalties.
    const reliabilityScore = Math.max(0, Math.min(100,
      100 - ((100 - onTimeRate) * 0.3) - damageRate * 0.4 - expiredRate * 0.2 - Math.min(10, openIncidents * 2)
    ));
    return {
      supplier: { _id: supplier._id, name: supplier.name },
      unitsBought: batch.units,
      spend: batch.spend,
      avgLeadTimeDays: delivery.leadTime ?? supplier.leadTimeDays,
      avgQualityRating: batch.ratingCount ? batch.ratingTotal / batch.ratingCount : null,
      damageRate,
      expiredRate,
      openIncidents,
      reliabilityScore,
    };
  }).sort((left, right) => right.reliabilityScore - left.reliabilityScore);
  res.json(leaderboard);
}
