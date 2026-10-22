import Drug from "../models/Drug.js";
import Batch from "../models/Batch.js";
import Order from "../models/Order.js";
import Supplier from "../models/Supplier.js";

export const getDashboardStats = async (req, res) => {
  try {
    const [totalDrugs, totalSuppliers, totalBatches] = await Promise.all([
      Drug.countDocuments(),
      Supplier.countDocuments(),
      Batch.countDocuments({ status: { $ne: "depleted" } }),
    ]);

    const stockValueAgg = await Batch.aggregate([
      { $match: { quantityInStock: { $gt: 0 } } },
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

    const now = new Date();
    const in30Days = new Date();
    in30Days.setDate(now.getDate() + 30);

    const [expiringSoonCount, expiredCount] = await Promise.all([
      Batch.countDocuments({ expiryDate: { $gte: now, $lte: in30Days }, quantityInStock: { $gt: 0 } }),
      Batch.countDocuments({ expiryDate: { $lt: now }, quantityInStock: { $gt: 0 } }),
    ]);

    // low stock count
    const drugs = await Drug.find();
    let lowStockCount = 0;
    for (const drug of drugs) {
      const agg = await Batch.aggregate([
        { $match: { drug: drug._id, status: { $ne: "depleted" } } },
        { $group: { _id: null, total: { $sum: "$quantityInStock" } } },
      ]);
      const total = agg[0]?.total || 0;
      if (total <= drug.reorderThreshold) lowStockCount++;
    }

    const ordersByStatus = await Order.aggregate([
      { $group: { _id: { orderType: "$orderType", status: "$status" }, count: { $sum: 1 } } },
    ]);

    const categoryBreakdown = await Batch.aggregate([
      { $match: { quantityInStock: { $gt: 0 } } },
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
