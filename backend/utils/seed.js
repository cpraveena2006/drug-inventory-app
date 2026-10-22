import dotenv from "dotenv";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Supplier from "../models/Supplier.js";
import Drug from "../models/Drug.js";
import Batch from "../models/Batch.js";
import Order from "../models/Order.js";
import AuditLog from "../models/AuditLog.js";
import Incident from "../models/Incident.js";
import Notification from "../models/Notification.js";
import DrugRequest from "../models/DrugRequest.js";
import SupplierInquiry from "../models/SupplierInquiry.js";

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
    Incident.deleteMany({}),
    Notification.deleteMany({}),
    DrugRequest.deleteMany({}),
    SupplierInquiry.deleteMany({}),
  ]);

  console.log("Creating users...");
  const [, pharmacist] = await User.create([
    { name: "Admin User", email: "admin@example.com", password: "password123", role: "admin" },
    { name: "Priya Pharmacist", email: "pharmacist@example.com", password: "password123", role: "pharmacist" },
  ]);

  console.log("Creating suppliers...");
  const [supplierA, supplierB, supplierC, supplierD] = await Supplier.create([
    { name: "MedSource Pharma", contactPerson: "Ravi Kumar", email: "ravi@medsource.com", phone: "9876543210", leadTimeDays: 4 },
    { name: "HealWell Distributors", contactPerson: "Anita Rao", email: "anita@healwell.com", phone: "9123456780", leadTimeDays: 14 },
    { name: "QualityFirst Medical", contactPerson: "Maya Shah", email: "maya@qualityfirst.example", phone: "9000011111", leadTimeDays: 6 },
    { name: "ValueMed Wholesale", contactPerson: "Arun Nair", email: "arun@valuemed.example", phone: "9000022222", leadTimeDays: 9 },
  ]);

  console.log("Creating supplier portal users...");
  await User.create([
    { name: "MedSource Supplier", email: "supplier1@example.com", password: "password123", role: "supplier", supplier: supplierA._id },
    { name: "HealWell Supplier", email: "supplier2@example.com", password: "password123", role: "supplier", supplier: supplierB._id },
    { name: "QualityFirst Supplier", email: "supplier3@example.com", password: "password123", role: "supplier", supplier: supplierC._id },
    { name: "ValueMed Supplier", email: "supplier4@example.com", password: "password123", role: "supplier", supplier: supplierD._id },
  ]);

  console.log("Creating drugs...");
  const [paracetamol, amoxicillin, cetirizine, insulin, azithromycin, omeprazole, vitaminC] = await Drug.create([
    { name: "Paracetamol 500mg", genericName: "Paracetamol", category: "Analgesic", manufacturer: "Cipla", unitPrice: 2.5, unit: "strip", reorderThreshold: 100 },
    { name: "Amoxicillin 250mg", genericName: "Amoxicillin", category: "Antibiotic", manufacturer: "Sun Pharma", unitPrice: 5, unit: "strip", reorderThreshold: 60, requiresPrescription: true },
    { name: "Cetirizine 10mg", genericName: "Cetirizine", category: "Antihistamine", manufacturer: "Dr. Reddy's", unitPrice: 1.8, unit: "strip", reorderThreshold: 80 },
    { name: "Insulin Glargine", genericName: "Insulin Glargine", category: "Hormone", manufacturer: "Novo Nordisk", unitPrice: 350, unit: "vial", reorderThreshold: 20, requiresPrescription: true },
    { name: "Azithromycin 500mg", genericName: "Azithromycin", category: "Antibiotic", manufacturer: "Cipla", unitPrice: 18, unit: "strip", reorderThreshold: 35, requiresPrescription: true },
    { name: "Omeprazole 20mg", genericName: "Omeprazole", category: "Gastrointestinal", manufacturer: "Sun Pharma", unitPrice: 4.2, unit: "strip", reorderThreshold: 50 },
    { name: "Vitamin C 500mg", genericName: "Ascorbic acid", category: "Supplement", manufacturer: "HealthPlus", unitPrice: 3.1, unit: "strip", reorderThreshold: 40 },
  ]);

  console.log("Creating batches...");
  await Batch.create([
    { drug: paracetamol._id, supplier: supplierA._id, batchNumber: "PARA-001", manufactureDate: daysFromNow(-180), receivedDate: daysFromNow(-165), expiryDate: daysFromNow(400), quantityReceived: 500, quantityInStock: 150, purchasePrice: 1.2, qualityRating: 5, qualityTags: ["good"] },
    { drug: paracetamol._id, supplier: supplierC._id, batchNumber: "PARA-002", manufactureDate: daysFromNow(-130), receivedDate: daysFromNow(-120), expiryDate: daysFromNow(15), quantityReceived: 200, quantityInStock: 40, purchasePrice: 1.1, qualityRating: 4, qualityTags: ["good"] },
    { drug: amoxicillin._id, supplier: supplierB._id, batchNumber: "AMOX-011", manufactureDate: daysFromNow(-155), receivedDate: daysFromNow(-140), expiryDate: daysFromNow(260), quantityReceived: 300, quantityInStock: 45, purchasePrice: 3.1, qualityRating: 3, qualityNotes: "Delivery arrived later than planned.", qualityTags: ["short expiry"] },
    { drug: amoxicillin._id, supplier: supplierA._id, batchNumber: "AMOX-012", manufactureDate: daysFromNow(-90), receivedDate: daysFromNow(-80), expiryDate: daysFromNow(330), quantityReceived: 150, quantityInStock: 60, purchasePrice: 3.4, qualityRating: 5, qualityTags: ["good"] },
    { drug: cetirizine._id, supplier: supplierD._id, batchNumber: "CETI-005", manufactureDate: daysFromNow(-220), receivedDate: daysFromNow(-200), expiryDate: daysFromNow(-5), quantityInStock: 30, quantityReceived: 150, purchasePrice: 0.9, quantityExpiredWriteOff: 10, status: "expired", qualityRating: 2, qualityTags: ["packaging damaged", "short expiry"] },
    { drug: insulin._id, supplier: supplierC._id, batchNumber: "INSU-020", manufactureDate: daysFromNow(-120), receivedDate: daysFromNow(-105), expiryDate: daysFromNow(500), quantityReceived: 50, quantityInStock: 35, purchasePrice: 280, qualityRating: 5, qualityTags: ["good"] },
    { drug: insulin._id, supplier: supplierB._id, batchNumber: "INSU-021", manufactureDate: daysFromNow(-70), receivedDate: daysFromNow(-60), expiryDate: daysFromNow(430), quantityReceived: 30, quantityInStock: 24, quantityDamaged: 3, purchasePrice: 295, qualityRating: 2, qualityNotes: "Temperature indicator showed a brief excursion.", qualityTags: ["packaging damaged"] },
    { drug: azithromycin._id, supplier: supplierA._id, batchNumber: "AZI-001", manufactureDate: daysFromNow(-170), receivedDate: daysFromNow(-160), expiryDate: daysFromNow(200), quantityReceived: 80, quantityInStock: 0, purchasePrice: 12, depletedAt: daysFromNow(-18), status: "depleted", qualityRating: 4 },
    { drug: omeprazole._id, supplier: supplierD._id, batchNumber: "OME-001", manufactureDate: daysFromNow(-40), receivedDate: daysFromNow(-30), expiryDate: daysFromNow(350), quantityReceived: 100, quantityInStock: 88, purchasePrice: 2.4, qualityRating: 4, qualityTags: ["good"] },
    { drug: vitaminC._id, supplier: supplierC._id, batchNumber: "VITC-001", manufactureDate: daysFromNow(-20), receivedDate: daysFromNow(-14), expiryDate: daysFromNow(550), quantityReceived: 120, quantityInStock: 120, purchasePrice: 1.8, qualityRating: 5, qualityTags: ["good"] },
  ]);

  console.log("Creating demo requests, inquiries and incidents...");
  const [requestAntiviral, requestPediatric] = await DrugRequest.create([
    {
      drugName: "Oseltamivir 75mg", normalizedName: "oseltamivir 75mg",
      totalQuantityRequested: 22, demandCount: 3, lastRequestedAt: daysFromNow(-1),
      status: "inquiry_sent",
      requests: [
        { customerName: "North Clinic", quantity: 10, requestedAt: daysFromNow(-7), loggedBy: pharmacist._id },
        { customerName: "Walk-in customer", quantity: 5, requestedAt: daysFromNow(-3), loggedBy: pharmacist._id },
        { customerName: "City Hospital", quantity: 7, requestedAt: daysFromNow(-1), loggedBy: pharmacist._id },
      ],
    },
    {
      drugName: "Pediatric Amoxicillin Suspension", normalizedName: "pediatric amoxicillin suspension",
      totalQuantityRequested: 14, demandCount: 2, lastRequestedAt: daysFromNow(-2),
      status: "inquiry_sent",
      requests: [
        { customerName: "Family Clinic", quantity: 8, requestedAt: daysFromNow(-12), loggedBy: pharmacist._id },
        { customerName: "Walk-in customer", quantity: 6, requestedAt: daysFromNow(-2), loggedBy: pharmacist._id },
      ],
    },
  ]);
  const [inquiryAntiviral, inquiryPediatric] = await SupplierInquiry.create([
    {
      drugRequest: requestAntiviral._id, drugName: requestAntiviral.drugName, quantityNeeded: 22,
      neededBy: daysFromNow(5), message: "Please provide price and delivery estimate.", createdBy: pharmacist._id,
      responses: [
        { supplier: supplierA._id, status: "available", availableQuantity: 30, unitPrice: 16, leadTimeDays: 4, note: "Available from current stock.", respondedAt: daysFromNow(-1) },
        { supplier: supplierB._id, status: "pending" },
        { supplier: supplierC._id, status: "unavailable", note: "No stock until next month.", respondedAt: daysFromNow(-1) },
      ],
    },
    {
      drugRequest: requestPediatric._id, drugName: requestPediatric.drugName, quantityNeeded: 14,
      neededBy: daysFromNow(7), message: "Looking for pediatric suspension stock.", createdBy: pharmacist._id,
      responses: [
        { supplier: supplierB._id, status: "available", availableQuantity: 20, unitPrice: 22, leadTimeDays: 6, note: "Can deliver this week.", respondedAt: daysFromNow(-2) },
        { supplier: supplierD._id, status: "pending" },
      ],
    },
  ]);
  const azithromycinBatch = await Batch.findOne({ drug: azithromycin._id });
  const damagedInsulinBatch = await Batch.findOne({ drug: insulin._id, quantityDamaged: { $gt: 0 } });
  const [stockoutIncident, damagedIncident, expiryIncident] = await Incident.create([
    { type: "STOCKOUT", drug: azithromycin._id, batch: azithromycinBatch._id, supplier: supplierA._id, quantityAffected: 0, reason: "Azithromycin is currently out of sellable stock.", severity: "critical", status: "supplier_notified", reportedBy: "system", supplierNotifiedAt: daysFromNow(-1), dedupeKey: "DEMO:STOCKOUT:AZI" },
    { type: "DAMAGED", drug: insulin._id, batch: damagedInsulinBatch._id, supplier: supplierB._id, quantityAffected: 3, reason: "Three insulin vials were reported damaged on arrival.", severity: "warning", status: "acknowledged", reportedBy: pharmacist._id, supplierNotifiedAt: daysFromNow(-3), supplierResponse: "We are reviewing the temperature log." },
    { type: "EXPIRED", drug: cetirizine._id, supplier: supplierD._id, quantityAffected: 30, reason: "Expired stock remains visible for write-off and traceability.", severity: "critical", status: "open", reportedBy: "system" },
  ]);
  await Promise.all([
    Notification.create([
      { recipientSupplier: supplierA._id, type: "incident", title: "STOCKOUT incident reported", message: stockoutIncident.reason, relatedModel: "Incident", relatedId: stockoutIncident._id },
      { recipientSupplier: supplierB._id, type: "incident", title: "DAMAGED incident reported", message: damagedIncident.reason, relatedModel: "Incident", relatedId: damagedIncident._id },
      { recipientSupplier: supplierD._id, type: "incident", title: "EXPIRED incident reported", message: expiryIncident.reason, relatedModel: "Incident", relatedId: expiryIncident._id },
    ]),
    Notification.create([
      { recipientSupplier: supplierA._id, type: "supplier_inquiry", title: `Quote requested: ${inquiryAntiviral.drugName}`, message: inquiryAntiviral.message, relatedModel: "SupplierInquiry", relatedId: inquiryAntiviral._id },
      { recipientSupplier: supplierB._id, type: "supplier_inquiry", title: `Quote requested: ${inquiryPediatric.drugName}`, message: inquiryPediatric.message, relatedModel: "SupplierInquiry", relatedId: inquiryPediatric._id },
    ]),
  ]);

  console.log("Seed complete.");
  console.log("Demo logins (password: password123):");
  console.log("  admin@example.com");
  console.log("  pharmacist@example.com");
  console.log("  supplier1@example.com (MedSource Pharma)");
  console.log("  supplier2@example.com (HealWell Distributors)");
  console.log("  supplier3@example.com (QualityFirst Medical)");
  console.log("  supplier4@example.com (ValueMed Wholesale)");
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
