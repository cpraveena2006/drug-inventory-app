import dotenv from "dotenv";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Supplier from "../models/Supplier.js";
import Drug from "../models/Drug.js";
import Batch from "../models/Batch.js";
import Order from "../models/Order.js";
import AuditLog from "../models/AuditLog.js";

dotenv.config();

const daysFromNow = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

const run = async () => {
  await connectDB();
  console.log("Clearing existing data...");
  await Promise.all([
    User.deleteMany({}),
    Supplier.deleteMany({}),
    Drug.deleteMany({}),
    Batch.deleteMany({}),
    Order.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  console.log("Creating users...");
  await User.create([
    { name: "Admin User", email: "admin@example.com", password: "password123", role: "admin" },
    { name: "Priya Pharmacist", email: "pharmacist@example.com", password: "password123", role: "pharmacist" },
  ]);

  console.log("Creating suppliers...");
  const [supplierA, supplierB] = await Supplier.create([
    { name: "MedSource Pharma", contactPerson: "Ravi Kumar", email: "ravi@medsource.com", phone: "9876543210", leadTimeDays: 5 },
    { name: "HealWell Distributors", contactPerson: "Anita Rao", email: "anita@healwell.com", phone: "9123456780", leadTimeDays: 10 },
  ]);

  console.log("Creating drugs...");
  const [paracetamol, amoxicillin, cetirizine, insulin] = await Drug.create([
    { name: "Paracetamol 500mg", genericName: "Paracetamol", category: "Analgesic", manufacturer: "Cipla", unitPrice: 2.5, unit: "strip", reorderThreshold: 100 },
    { name: "Amoxicillin 250mg", genericName: "Amoxicillin", category: "Antibiotic", manufacturer: "Sun Pharma", unitPrice: 5, unit: "strip", reorderThreshold: 60, requiresPrescription: true },
    { name: "Cetirizine 10mg", genericName: "Cetirizine", category: "Antihistamine", manufacturer: "Dr. Reddy's", unitPrice: 1.8, unit: "strip", reorderThreshold: 80 },
    { name: "Insulin Glargine", genericName: "Insulin Glargine", category: "Hormone", manufacturer: "Novo Nordisk", unitPrice: 350, unit: "vial", reorderThreshold: 20, requiresPrescription: true },
  ]);

  console.log("Creating batches...");
  await Batch.create([
    { drug: paracetamol._id, supplier: supplierA._id, batchNumber: "PARA-001", manufactureDate: daysFromNow(-200), expiryDate: daysFromNow(400), quantityReceived: 500, quantityInStock: 500 },
    { drug: paracetamol._id, supplier: supplierA._id, batchNumber: "PARA-002", manufactureDate: daysFromNow(-350), expiryDate: daysFromNow(15), quantityReceived: 200, quantityInStock: 40 }, // expiring soon
    { drug: amoxicillin._id, supplier: supplierB._id, batchNumber: "AMOX-011", manufactureDate: daysFromNow(-100), expiryDate: daysFromNow(260), quantityReceived: 300, quantityInStock: 45 }, // low stock
    { drug: cetirizine._id, supplier: supplierA._id, batchNumber: "CETI-005", manufactureDate: daysFromNow(-60), expiryDate: daysFromNow(-5), quantityInStock: 30, quantityReceived: 150, status: "expired" }, // expired, still in stock
    { drug: insulin._id, supplier: supplierB._id, batchNumber: "INSU-020", manufactureDate: daysFromNow(-30), expiryDate: daysFromNow(500), quantityReceived: 50, quantityInStock: 50 },
  ]);

  console.log("Seed complete.");
  console.log("Login with: admin@example.com / password123  (or pharmacist@example.com / password123)");
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
