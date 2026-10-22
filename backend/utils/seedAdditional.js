
import dotenv from "dotenv";
import connectDB from "../config/db.js";
import User from "../models/User.js";
import Supplier from "../models/Supplier.js";
import Drug from "../models/Drug.js";
import Batch from "../models/Batch.js";
import Order from "../models/Order.js";
import DrugRequest from "../models/DrugRequest.js";
import SupplierInquiry from "../models/SupplierInquiry.js";
import { createIncident } from "../services/incidentService.js";

dotenv.config();

const daysFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const sampleDrugs = [
  { name: "Ibuprofen 200mg", genericName: "Ibuprofen", category: "Analgesic", manufacturer: "Cipla", unit: "strip", unitPrice: 4.5, purchasePrice: 2.5, reorderThreshold: 80, requiresPrescription: false, unitsDispatched: 240, currentStock: 40, expiryInDays: 210 },
  { name: "Azithromycin 500mg", genericName: "Azithromycin", category: "Antibiotic", manufacturer: "Sun Pharma", unit: "strip", unitPrice: 12, purchasePrice: 7, reorderThreshold: 50, requiresPrescription: true, unitsDispatched: 150, currentStock: 35, expiryInDays: 18 },
  { name: "Metformin 500mg", genericName: "Metformin", category: "Antidiabetic", manufacturer: "USV", unit: "strip", unitPrice: 3.2, purchasePrice: 1.8, reorderThreshold: 180, requiresPrescription: true, unitsDispatched: 360, currentStock: 220, expiryInDays: 330 },
  { name: "Omeprazole 20mg", genericName: "Omeprazole", category: "Gastrointestinal", manufacturer: "Dr. Reddy's", unit: "capsule", unitPrice: 2.8, purchasePrice: 1.6, reorderThreshold: 100, requiresPrescription: false, unitsDispatched: 210, currentStock: 80, expiryInDays: 250 },
  { name: "Vitamin C 500mg", genericName: "Ascorbic acid", category: "Supplement", manufacturer: "Himalaya", unit: "tablet", unitPrice: 1.5, purchasePrice: 0.8, reorderThreshold: 60, requiresPrescription: false, unitsDispatched: 70, currentStock: 120, expiryInDays: 400 },
  { name: "ORS Sachets", genericName: "Oral rehydration salts", category: "Rehydration", manufacturer: "FDC", unit: "sachet", unitPrice: 8, purchasePrice: 5, reorderThreshold: 80, requiresPrescription: false, unitsDispatched: 36, currentStock: 20, expiryInDays: 320 },
  { name: "Cough Syrup 100ml", genericName: "Dextromethorphan", category: "Cough and cold", manufacturer: "Mankind Pharma", unit: "bottle", unitPrice: 65, purchasePrice: 40, reorderThreshold: 35, requiresPrescription: false, unitsDispatched: 90, currentStock: 60, expiryInDays: 5 },
  { name: "Atorvastatin 10mg", genericName: "Atorvastatin", category: "Cardiovascular", manufacturer: "Zydus", unit: "strip", unitPrice: 6.5, purchasePrice: 4, reorderThreshold: 120, requiresPrescription: true, unitsDispatched: 180, currentStock: 240, expiryInDays: 280 },
];

const splitQuantity = (quantity, part, totalParts) => {
  const base = Math.floor(quantity / totalParts);
  return base + (part < quantity % totalParts ? 1 : 0);
};

const run = async () => {
  await connectDB();

  let user = await User.findOne({ email: "admin@example.com" });
  if (!user) {
    user = await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: "password123",
      role: "admin",
    });
  }

  const suppliers = await Promise.all([
    Supplier.findOneAndUpdate(
      { name: "NorthStar Medical Supply" },
      { $setOnInsert: { name: "NorthStar Medical Supply", contactPerson: "Kavita Shah", email: "orders@northstarmed.example", leadTimeDays: 6 } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
    Supplier.findOneAndUpdate(
      { name: "CareBridge Distributors" },
      { $setOnInsert: { name: "CareBridge Distributors", contactPerson: "Arjun Nair", email: "sales@carebridge.example", leadTimeDays: 9 } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ),
  ]);

  const seeded = [];
  for (let index = 0; index < sampleDrugs.length; index += 1) {
    const sample = sampleDrugs[index];
    const drug = await Drug.findOneAndUpdate(
      { name: sample.name },
      {
        $setOnInsert: {
          name: sample.name,
          genericName: sample.genericName,
          category: sample.category,
          manufacturer: sample.manufacturer,
          unit: sample.unit,
          unitPrice: sample.unitPrice,
          reorderThreshold: sample.reorderThreshold,
          requiresPrescription: sample.requiresPrescription,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    const batchNumber = `DEMO-${String(index + 1).padStart(3, "0")}`;
    const batch = await Batch.findOneAndUpdate(
      { drug: drug._id, batchNumber },
      {
        $setOnInsert: {
          drug: drug._id,
          supplier: suppliers[index % suppliers.length]._id,
          batchNumber,
          manufactureDate: daysFromNow(-120),
          expiryDate: daysFromNow(sample.expiryInDays),
          quantityReceived: sample.unitsDispatched + sample.currentStock,
          quantityInStock: sample.currentStock,
          warehouseLocation: index % 2 === 0 ? "Main Warehouse" : "North Storage",
        },
        $set: { purchasePrice: sample.purchasePrice },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    seeded.push({ sample, drug, batch });
  }

  const buyerNames = [
    "CityCare Hospital",
    "Green Cross Pharmacy",
    "Riverside Clinic",
    "Central Medical Centre",
    "Sunrise Health Clinic",
    "Community Care Pharmacy",
  ];
  const periodDays = 30;
  const sampleOrderCount = 6;
  let createdOrders = 0;
  for (let part = 0; part < sampleOrderCount; part += 1) {
    const orderDate = daysFromNow(-25 + part * 5);
    const sampleKey = `sample-demand-${part + 1}`;
    const exists = await Order.exists({
      orderType: "dispatch",
      buyerName: buyerNames[part],
      notes: { $regex: /^sample-demand-/ },
    });
    if (exists) continue;

    const items = seeded
      .map(({ sample, drug, batch }) => ({
        drug: drug._id,
        batch: batch._id,
        quantity: splitQuantity(sample.unitsDispatched, part, sampleOrderCount),
        unitPrice: sample.unitPrice,
      }))
      .filter((item) => item.quantity > 0);

    await Order.create({
      orderType: "dispatch",
      buyerName: buyerNames[part],
      items,
      notes: sampleKey,
      status: "approved",
      createdBy: user._id,
      createdAt: orderDate,
      updatedAt: orderDate,
    });
    createdOrders += 1;
  }

  const expiringDrug = seeded.find(({ sample }) => sample.name === "Azithromycin 500mg");
  const expiredBatchNumber = "DEMO-EXPIRED-001";
  await Batch.findOneAndUpdate(
    { drug: expiringDrug.drug._id, batchNumber: expiredBatchNumber },
    {
      $setOnInsert: {
        drug: expiringDrug.drug._id,
        supplier: suppliers[0]._id,
        batchNumber: expiredBatchNumber,
        manufactureDate: daysFromNow(-420),
        expiryDate: daysFromNow(-8),
        quantityReceived: 24,
        quantityInStock: 24,
        status: "expired",
        warehouseLocation: "Quarantine Shelf",
      },
      $set: { purchasePrice: expiringDrug.sample.purchasePrice },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const sampleIncidents = [
    {
      type: "DAMAGED",
      drug: seeded.find(({ sample }) => sample.name === "Ibuprofen 200mg"),
      quantityAffected: 3,
      reason: "Sample incident: 3 strips were damaged during warehouse handling.",
      dedupeKey: "sample-seed:DAMAGED:ibuprofen",
    },
    {
      type: "QUALITY_ISSUE",
      drug: seeded.find(({ sample }) => sample.name === "Metformin 500mg"),
      quantityAffected: 6,
      reason: "Sample incident: packaging inspection flagged 6 strips for supplier review.",
      dedupeKey: "sample-seed:QUALITY_ISSUE:metformin",
    },
    {
      type: "RECALLED",
      drug: seeded.find(({ sample }) => sample.name === "Atorvastatin 10mg"),
      quantityAffected: 12,
      reason: "Sample incident: a 12-unit batch is held pending a simulated recall review.",
      dedupeKey: "sample-seed:RECALLED:atorvastatin",
    },
  ];
  for (const incident of sampleIncidents) {
    await createIncident({
      type: incident.type,
      drug: incident.drug.drug._id,
      batch: incident.drug.batch._id,
      supplier: incident.drug.batch.supplier,
      quantityAffected: incident.quantityAffected,
      reason: incident.reason,
      reportedBy: user._id,
      dedupeKey: incident.dedupeKey,
    });
  }

  const unavailableDrugSamples = [
    {
      drugName: "Sample unavailable - Oseltamivir 75mg",
      normalizedName: "sample unavailable - oseltamivir 75mg",
      quantity: 24,
      customerName: "Sample CityCare Clinic",
      notes: "Sample data: requested medicine is not currently in the drug catalog.",
      message: "Sample data: please confirm whether this medicine can be sourced.",
      responses: [
        { supplier: suppliers[0]._id, status: "unavailable", availableQuantity: 0, note: "Sample response: currently out of stock." },
        { supplier: suppliers[1]._id, status: "unavailable", availableQuantity: 0, note: "Sample response: not available from this supplier." },
      ],
    },
    {
      drugName: "Sample unavailable - Insulin Glargine Pen",
      normalizedName: "sample unavailable - insulin glargine pen",
      quantity: 12,
      customerName: "Sample Riverside Clinic",
      notes: "Sample data: requested medicine is not currently in the drug catalog.",
      message: "Sample data: requesting supplier availability and pricing.",
      responses: [
        { supplier: suppliers[0]._id, status: "unavailable", availableQuantity: 0, note: "Sample response: no stock available." },
        { supplier: suppliers[1]._id, status: "available", availableQuantity: 8, unitPrice: 185, leadTimeDays: 4, note: "Sample response: 8 units available." },
      ],
    },
  ];

  let createdUnavailableDrugRequests = 0;
  let createdSupplierInquiries = 0;
  for (const sample of unavailableDrugSamples) {
    let request = await DrugRequest.findOne({ normalizedName: sample.normalizedName });
    if (!request) {
      const requestedAt = daysFromNow(-4);
      request = await DrugRequest.create({
        drugName: sample.drugName,
        normalizedName: sample.normalizedName,
        totalQuantityRequested: sample.quantity,
        demandCount: 2,
        lastRequestedAt: requestedAt,
        status: "inquiry_sent",
        requests: [
          {
            customerName: sample.customerName,
            quantity: sample.quantity,
            notes: sample.notes,
            requestedAt,
            loggedBy: user._id,
          },
          {
            customerName: sample.customerName,
            quantity: Math.max(1, Math.floor(sample.quantity / 2)),
            notes: sample.notes,
            requestedAt: daysFromNow(-2),
            loggedBy: user._id,
          },
        ],
      });
      createdUnavailableDrugRequests += 1;
    }

    const inquiryMessage = sample.message;
    let inquiry = await SupplierInquiry.findOne({ drugRequest: request._id, message: inquiryMessage });
    if (!inquiry) {
      inquiry = await SupplierInquiry.create({
        drugRequest: request._id,
        drugName: request.drugName,
        quantityNeeded: sample.quantity,
        neededBy: daysFromNow(5),
        message: inquiryMessage,
        createdBy: user._id,
        responses: sample.responses.map((response) => ({
          ...response,
          respondedAt: daysFromNow(-1),
        })),
      });
      createdSupplierInquiries += 1;
    }
  }

  console.log(`Added sample inventory for ${seeded.length} medicines; created ${createdOrders} sample dispatch orders (${periodDays}-day forecast history).`);
  console.log(`Ensured ${sampleIncidents.length} repeatable incident examples; created ${createdUnavailableDrugRequests} unavailable-drug requests and ${createdSupplierInquiries} supplier inquiries.`);
  console.log("This additive sample seeder does not clear existing records.");
  process.exit(0);
};

run().catch((err) => {
  console.error("Failed to add sample data:", err);
  process.exit(1);
});
