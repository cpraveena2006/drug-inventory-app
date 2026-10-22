import "dotenv/config";
import connectDB from "../config/db.js";
import Batch from "../models/Batch.js";
import Drug from "../models/Drug.js";
import Supplier from "../models/Supplier.js";
import User from "../models/User.js";

async function runMigration() {
  await connectDB();

  const batches = await Batch.updateMany({}, [
    {
      $set: {
        receivedDate: { $ifNull: ["$receivedDate", "$createdAt"] },
        purchasePrice: { $ifNull: ["$purchasePrice", 0] },
        quantityDamaged: { $ifNull: ["$quantityDamaged", 0] },
        quantityExpiredWriteOff: { $ifNull: ["$quantityExpiredWriteOff", 0] },
        qualityTags: { $ifNull: ["$qualityTags", []] },
        isDeleted: { $ifNull: ["$isDeleted", false] },
        depletedAt: {
          $cond: [
            { $and: [{ $eq: ["$status", "depleted"] }, { $eq: [{ $ifNull: ["$depletedAt", null] }, null] }] },
            "$updatedAt",
            "$depletedAt",
          ],
        },
      },
    },
  ]);
  const drugs = await Drug.updateMany({ isDeleted: { $exists: false } }, { $set: { isDeleted: false } });
  const suppliers = await Supplier.updateMany({ isDeleted: { $exists: false } }, { $set: { isDeleted: false } });
  const users = await User.updateMany({ isActive: { $exists: false } }, { $set: { isActive: true } });

  console.log(JSON.stringify({
    batches: batches.modifiedCount,
    drugs: drugs.modifiedCount,
    suppliers: suppliers.modifiedCount,
    users: users.modifiedCount,
  }));
}

runMigration()
  .catch((error) => {
    console.error("Migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    const mongoose = await import("mongoose");
    await mongoose.default.disconnect();
  });
