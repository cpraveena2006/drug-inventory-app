import Drug from "../models/Drug.js";
import Batch from "../models/Batch.js";
import Order from "../models/Order.js";
import Supplier from "../models/Supplier.js";

export const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const supplierFilter = req.user.role === "supplier" ? { supplier: req.user.supplier } : {};
    const liveBatchFilter = { ...supplierFilter, isDeleted: { $ne: true } };
    const [totalDrugs, totalSuppliers, totalBatches] = await Promise.all([
      Drug.countDocuments({ isDeleted: { $ne: true } }),
      req.user.role === "supplier" ? Supplier.countDocuments({ _id: req.user.supplier }) : Supplier.countDocuments({ isDeleted: { $ne: true } }),
      Batch.countDocuments({ ...liveBatchFilter, status: { $ne: "depleted" } }),
    ]);

    const stockValueAgg = await Batch.aggregate([
      { $match: { ...liveBatchFilter, status: "active", expiryDate: { $gt: now }, quantityInStock: { $gt: 0 } } },
      { $lookup: { from: "drugs", localField: "drug", foreignField: "_id", as: "drugInfo" } },
      { $unwind: "$drugInfo" },
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ["$quantityInStock", "$drugInfo.unitPrice"] } },
          totalUnits: { $sum: "$quantityInStock" },
        },
      },
    ]);

    const in30Days = new Date();
    in30Days.setDate(now.getDate() + 30);

    const [expiringSoonCount, expiredCount] = await Promise.all([
      Batch.countDocuments({ ...liveBatchFilter, expiryDate: { $gte: now, $lte: in30Days }, quantityInStock: { $gt: 0 } }),
      Batch.countDocuments({ ...liveBatchFilter, expiryDate: { $lt: now }, quantityInStock: { $gt: 0 } }),
    ]);

    const [drugs, sellableStock] = await Promise.all([
      Drug.find({ isDeleted: { $ne: true } }).select("_id reorderThreshold"),
      Batch.aggregate([
        { $match: { ...liveBatchFilter, status: "active", expiryDate: { $gt: now }, quantityInStock: { $gt: 0 } } },
        { $group: { _id: "$drug", total: { $sum: "$quantityInStock" } } },
      ]),
    ]);
    const sellableStockByDrug = new Map(sellableStock.map((entry) => [String(entry._id), entry.total]));
    const lowStockCount = drugs.filter(
      (drug) => (sellableStockByDrug.get(String(drug._id)) || 0) <= drug.reorderThreshold,
    ).length;

    const ordersByStatus = await Order.aggregate([
      { $match: supplierFilter },
      { $group: { _id: { orderType: "$orderType", status: "$status" }, count: { $sum: 1 } } },
    ]);

    const categoryBreakdown = await Batch.aggregate([
      { $match: { ...liveBatchFilter, status: "active", expiryDate: { $gt: now }, quantityInStock: { $gt: 0 } } },
      { $lookup: { from: "drugs", localField: "drug", foreignField: "_id", as: "drugInfo" } },
      { $unwind: "$drugInfo" },
      { $group: { _id: "$drugInfo.category", totalStock: { $sum: "$quantityInStock" } } },
      { $sort: { totalStock: -1 } },
    ]);

    res.json({
      totalDrugs,
      totalSuppliers,
      totalBatches,
      totalStockUnits: stockValueAgg[0]?.totalUnits || 0,
      totalStockValue: stockValueAgg[0]?.totalValue || 0,
      expiringSoonCount,
      expiredCount,
      lowStockCount,
      ordersByStatus,
      categoryBreakdown,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch dashboard stats", error: err.message });
  }
};

export const getDemandForecast = async (req, res) => {
  try {
    const periodDays = 30;
    const leadTimeDays = 7;
    const now = new Date();
    const supplierFilter = req.user.role === "supplier" ? { supplier: req.user.supplier } : {};
    const periodStart = new Date(now);
    periodStart.setDate(periodStart.getDate() - periodDays);

    const salesPipeline = [
      { $match: { orderType: "dispatch", status: { $ne: "cancelled" }, createdAt: { $gte: periodStart, $lte: now } } },
      { $unwind: "$items" },
      ...(req.user.role === "supplier" ? [
        { $lookup: { from: "batches", localField: "items.batch", foreignField: "_id", as: "batchInfo" } },
        { $unwind: "$batchInfo" },
        { $match: { "batchInfo.supplier": req.user.supplier, "batchInfo.isDeleted": { $ne: true } } },
      ] : []),
      { $group: { _id: "$items.drug", unitsDispatched: { $sum: "$items.quantity" } } },
    ];
    const [sales, stock, drugs] = await Promise.all([
      Order.aggregate(salesPipeline),
      Batch.aggregate([
        {
          $match: {
            ...supplierFilter,
            status: "active",
            isDeleted: { $ne: true },
            expiryDate: { $gt: now },
            quantityInStock: { $gt: 0 },
          },
        },
        { $group: { _id: "$drug", totalStock: { $sum: "$quantityInStock" } } },
      ]),
      Drug.find({ isDeleted: { $ne: true } }).select("name category unit reorderThreshold").sort({ name: 1 }),
    ]);

    const salesByDrug = new Map(sales.map((entry) => [String(entry._id), entry.unitsDispatched]));
    const stockByDrug = new Map(stock.map((entry) => [String(entry._id), entry.totalStock]));
    const forecasts = drugs.map((drug) => {
      const unitsDispatched = salesByDrug.get(String(drug._id)) || 0;
      const currentStock = stockByDrug.get(String(drug._id)) || 0;
      const averageDailyDemand = unitsDispatched / periodDays;
      const daysOfStock = averageDailyDemand > 0
        ? Math.floor(currentStock / averageDailyDemand)
        : null;
      const forecast30DayDemand = Math.ceil(averageDailyDemand * periodDays);
      const targetStock = Math.max(
        drug.reorderThreshold,
        Math.ceil(averageDailyDemand * (periodDays + leadTimeDays)),
      );

      return {
        drug: { _id: drug._id, name: drug.name, category: drug.category, unit: drug.unit },
        unitsDispatched,
        averageDailyDemand: Number(averageDailyDemand.toFixed(2)),
        forecast30DayDemand,
        currentStock,
        reorderThreshold: drug.reorderThreshold,
        daysOfStock,
        recommendedOrderQuantity: Math.max(0, targetStock - currentStock),
        atRisk: currentStock <= drug.reorderThreshold
          || (daysOfStock !== null && daysOfStock <= leadTimeDays),
      };
    }).sort((a, b) => (
      Number(b.atRisk) - Number(a.atRisk)
      || b.averageDailyDemand - a.averageDailyDemand
      || a.drug.name.localeCompare(b.drug.name)
    ));

    res.json({
      periodDays,
      leadTimeDays,
      generatedAt: now,
      forecasts,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate demand forecast", error: err.message });
  }
};
