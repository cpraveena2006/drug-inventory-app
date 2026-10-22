import request from "supertest";
import { jest } from "@jest/globals";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

beforeAll(() => {
  jest.setTimeout(120000);
}, 120000);

let app;
let mongoose;
let memoryServer;
let Drug;
let Supplier;
let Batch;
let User;
let Order;
let Incident;
let Notification;
let runExpiryCheck;
let checkDrugStock;
let notifySupplier;

beforeAll(async () => {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  let systemBinary = process.env.MONGOD_BINARY;
  if (!systemBinary && process.platform === "win32") {
    const installRoot = "C:\\Program Files\\MongoDB\\Server";
    if (existsSync(installRoot)) {
      const versions = readdirSync(installRoot).sort((left, right) => right.localeCompare(left, undefined, { numeric: true }));
      systemBinary = versions
        .map((version) => path.join(installRoot, version, "bin", "mongod.exe"))
        .find((candidate) => existsSync(candidate));
    }
  }
  if (!systemBinary) {
    console.warn("No local MongoDB binary found - allowing mongodb-memory-server to download its own binary");
  }
  const systemVersion = systemBinary
    ? execFileSync(systemBinary, ["--version"], { encoding: "utf8", timeout: 10000 }).match(/db version v(\d+\.\d+\.\d+)/)?.[1]
    : undefined;
  memoryServer = await MongoMemoryServer.create({
    binary: { ...(systemBinary ? { systemBinary, ...(systemVersion ? { version: systemVersion } : {}) } : {}) },
    instance: { launchTimeout: 30000 },
  });
  process.env.MONGO_URI = memoryServer.getUri();
  process.env.JWT_SECRET = "test-secret-with-at-least-24-characters";
  process.env.JWT_EXPIRES_IN = "1h";
  process.env.NODE_ENV = "test";
  process.env.CLIENT_URL = "http://localhost:5173";
  mongoose = await import("mongoose");
  app = (await import("../server.js")).default;
  await mongoose.default.connect(memoryServer.getUri());

  Drug = (await import("../models/Drug.js")).default;
  Supplier = (await import("../models/Supplier.js")).default;
  Batch = (await import("../models/Batch.js")).default;
  User = (await import("../models/User.js")).default;
  Order = (await import("../models/Order.js")).default;
  Incident = (await import("../models/Incident.js")).default;
  Notification = (await import("../models/Notification.js")).default;
  ({ runExpiryCheck } = await import("../services/expiryService.js"));
  ({ checkDrugStock } = await import("../services/incidentService.js"));
  ({ notifySupplier } = await import("../services/notificationService.js"));
});

beforeEach(async () => {
  await Promise.all(Object.values(mongoose.default.connection.collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  if (mongoose) await mongoose.default.disconnect();
  if (memoryServer) await memoryServer.stop();
});

async function createPharmacistToken() {
  const response = await request(app).post("/api/auth/register").send({
    name: "Test Pharmacist",
    email: "pharmacist@test.local",
    password: "password123",
  });
  expect(response.status).toBe(201);
  return response.body.token;
}

describe("inventory workflows", () => {
  it("serves independent health and OpenAPI endpoints", async () => {
    const health = await request(app).get("/api/health").expect(200);
    expect(health.body.status).toBe("ok");
    const spec = await request(app).get("/api/docs.json").expect(200);
    expect(spec.body.info.title).toBe("Drug Inventory & Supply Chain API");
    await request(app).get("/api/docs/").expect(200);
  });

  it("never allows public registration to create an admin", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Public User",
      email: "public@test.local",
      password: "password123",
      role: "admin",
    });
    expect(response.status).toBe(201);
    expect(response.body.user.role).toBe("pharmacist");
    expect(await User.countDocuments({ role: "admin" })).toBe(0);
  });

  it("dispatches FEFO across batches and creates a supplier stockout notification", async () => {
    const token = await createPharmacistToken();
    const supplier = await Supplier.create({ name: "Northstar Supply", email: "" });
    const drug = await Drug.create({ name: "Test Medicine", unitPrice: 5 });
    const earlyBatch = await Batch.create({
      drug: drug._id, supplier: supplier._id, batchNumber: "EARLY",
      manufactureDate: new Date("2025-01-01"), expiryDate: new Date("2027-01-01"),
      quantityReceived: 3, quantityInStock: 3,
    });
    const laterBatch = await Batch.create({
      drug: drug._id, supplier: supplier._id, batchNumber: "LATER",
      manufactureDate: new Date("2025-02-01"), expiryDate: new Date("2028-01-01"),
      quantityReceived: 4, quantityInStock: 4,
    });

    const response = await request(app)
      .post("/api/orders/dispatch")
      .set("Authorization", `Bearer ${token}`)
      .send({ buyerName: "Clinic", items: [{ drug: String(drug._id), quantity: 7, unitPrice: 8 }] });

    expect(response.status).toBe(201);
    expect(response.body.items.map((item) => String(item.batch._id))).toEqual([String(earlyBatch._id), String(laterBatch._id)]);
    expect((await Batch.findById(earlyBatch._id)).status).toBe("depleted");
    expect((await Batch.findById(laterBatch._id)).status).toBe("depleted");
    expect(await Order.countDocuments({ orderType: "dispatch" })).toBe(1);
    expect(await Incident.countDocuments({ type: "STOCKOUT", drug: drug._id })).toBe(1);
    expect(await Notification.countDocuments({ recipientSupplier: supplier._id, type: "incident" })).toBe(1);
  });

  it("rolls back partial FEFO decrements when stock is insufficient", async () => {
    const token = await createPharmacistToken();
    const supplier = await Supplier.create({ name: "Northstar Supply" });
    const drug = await Drug.create({ name: "Short Stock Medicine", unitPrice: 5 });
    const batch = await Batch.create({
      drug: drug._id, supplier: supplier._id, batchNumber: "SHORT",
      manufactureDate: new Date("2025-01-01"), expiryDate: new Date("2028-01-01"),
      quantityReceived: 4, quantityInStock: 4,
    });
    const response = await request(app)
      .post("/api/orders/dispatch")
      .set("Authorization", `Bearer ${token}`)
      .send({ buyerName: "Clinic", items: [{ drug: String(drug._id), quantity: 5, unitPrice: 8 }] });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("INSUFFICIENT_STOCK");
    expect((await Batch.findById(batch._id)).quantityInStock).toBe(4);
    expect(await Order.countDocuments({ orderType: "dispatch" })).toBe(0);
  });

  it("scopes supplier batch reads to the linked supplier account", async () => {
    const ownSupplier = await Supplier.create({ name: "Own Supplier" });
    const otherSupplier = await Supplier.create({ name: "Other Supplier" });
    const supplierUser = await User.create({
      name: "Supplier User",
      email: "supplier@test.local",
      password: "password123",
      role: "supplier",
      supplier: ownSupplier._id,
    });
    const drug = await Drug.create({ name: "Scoped Medicine", unitPrice: 3 });
    const createBatch = (supplier, batchNumber) => Batch.create({
      drug: drug._id, supplier, batchNumber,
      manufactureDate: new Date("2025-01-01"), expiryDate: new Date("2028-01-01"),
      quantityReceived: 5, quantityInStock: 5,
    });
    await Promise.all([createBatch(ownSupplier._id, "OWN"), createBatch(otherSupplier._id, "OTHER")]);
    const { default: generateToken } = await import("../utils/generateToken.js");
    const response = await request(app)
      .get("/api/batches")
      .set("Authorization", `Bearer ${generateToken(supplierUser._id)}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].batchNumber).toBe("OWN");
  });

  it("rejects damage beyond stock and records valid damage with an incident", async () => {
    const token = await createPharmacistToken();
    const supplier = await Supplier.create({ name: "Damage Supplier" });
    const drug = await Drug.create({ name: "Damage Test", unitPrice: 3 });
    const batch = await Batch.create({
      drug: drug._id, supplier: supplier._id, batchNumber: "DAMAGE",
      manufactureDate: new Date("2025-01-01"), expiryDate: new Date("2028-01-01"),
      quantityReceived: 5, quantityInStock: 5,
    });
    const invalid = await request(app)
      .post(`/api/batches/${batch._id}/report-damage`)
      .set("Authorization", `Bearer ${token}`)
      .send({ quantity: 6, reason: "Damaged packaging" });
    expect(invalid.status).toBe(409);
    expect((await Batch.findById(batch._id)).quantityInStock).toBe(5);

    const valid = await request(app)
      .post(`/api/batches/${batch._id}/report-damage`)
      .set("Authorization", `Bearer ${token}`)
      .send({ quantity: 2, reason: "Damaged packaging", tags: ["packaging damaged"] });
    expect(valid.status).toBe(201);
    expect((await Batch.findById(batch._id)).quantityInStock).toBe(3);
    expect((await Batch.findById(batch._id)).quantityDamaged).toBe(2);
    expect(await Incident.countDocuments({ type: "DAMAGED", batch: batch._id })).toBe(1);
    expect(await Notification.countDocuments({ recipientSupplier: supplier._id })).toBe(1);
  });

  it("aggregates repeated customer requests by normalized name", async () => {
    const token = await createPharmacistToken();
    const first = await request(app)
      .post("/api/requests")
      .set("Authorization", `Bearer ${token}`)
      .send({ drugName: "  Test  Drug ", quantity: 2, customerName: "Customer A" });
    const second = await request(app)
      .post("/api/requests")
      .set("Authorization", `Bearer ${token}`)
      .send({ drugName: "test drug", quantity: 3, customerName: "Customer B" });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body._id).toBe(first.body._id);
    expect(second.body.demandCount).toBe(2);
    expect(second.body.totalQuantityRequested).toBe(5);
    expect(second.body.requests).toHaveLength(2);
  });

  it("returns insight sales calculations and enforces authentication", async () => {
    const unauthenticated = await request(app).get("/api/batches");
    expect(unauthenticated.status).toBe(401);

    const token = await createPharmacistToken();
    const supplier = await Supplier.create({ name: "Insight Supplier", leadTimeDays: 6 });
    const drug = await Drug.create({ name: "Insight Medicine", unitPrice: 5 });
    await Batch.create({
      drug: drug._id, supplier: supplier._id, batchNumber: "INSIGHT",
      manufactureDate: new Date("2025-01-01"), receivedDate: new Date(Date.now() - 10 * 86400000),
      expiryDate: new Date("2028-01-01"), quantityReceived: 10, quantityInStock: 10,
      purchasePrice: 3, qualityRating: 4,
    });
    await request(app)
      .post("/api/orders/dispatch")
      .set("Authorization", `Bearer ${token}`)
      .send({ buyerName: "Clinic", items: [{ drug: String(drug._id), quantity: 5, unitPrice: 5 }] })
      .expect(201);
    const response = await request(app)
      .get(`/api/drugs/${drug._id}/insights`)
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.salesPerformance.sellThroughRate).toBe(50);
    expect(response.body.salesPerformance.perBatch[0].soldQty).toBe(5);
  });

  it("paginates and searches the drug catalog on the server", async () => {
    const token = await createPharmacistToken();
    await Drug.create(Array.from({ length: 12 }, (_, index) => ({
      name: `Pagination Medicine ${index + 1}`,
      category: index % 2 ? "Analgesic" : "Antibiotic",
      unitPrice: 2,
    })));
    const response = await request(app)
      .get("/api/drugs?page=2&limit=5&search=Pagination")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(5);
    expect(response.body.pagination).toEqual({ page: 2, limit: 5, total: 12, pages: 3 });
    expect(response.body.categories).toEqual(["Analgesic", "Antibiotic"]);
  });

  it("paginates batch search results and reports inventory counts", async () => {
    const token = await createPharmacistToken();
    const supplier = await Supplier.create({ name: "Page Supplier" });
    const drug = await Drug.create({ name: "Page Medicine", unitPrice: 2 });
    await Batch.create(Array.from({ length: 3 }, (_, index) => ({
      drug: drug._id,
      supplier: supplier._id,
      batchNumber: `PAGE-${index + 1}`,
      manufactureDate: new Date("2025-01-01"),
      expiryDate: new Date("2028-01-01"),
      quantityReceived: 5,
      quantityInStock: 5,
    })));
    const response = await request(app)
      .get("/api/batches?page=1&limit=2&search=Page")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.pagination.total).toBe(3);
    expect(response.body.counts.all).toBe(3);
  });

  it("paginates order search results while retaining order-type counts", async () => {
    const token = await createPharmacistToken();
    const user = await User.findOne({ email: "pharmacist@test.local" });
    const drug = await Drug.create({ name: "Order Page Medicine", unitPrice: 2 });
    await Order.create(Array.from({ length: 3 }, (_, index) => ({
      orderType: "dispatch",
      buyerName: `Page Clinic ${index + 1}`,
      items: [{ drug: drug._id, quantity: 1, unitPrice: 2 }],
      createdBy: user._id,
    })));
    const response = await request(app)
      .get("/api/orders?page=2&limit=1&search=Page")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.pagination.total).toBe(3);
    expect(response.body.counts.dispatch).toBe(3);
  });

  it("paginates supplier search results without exposing other suppliers", async () => {
    const token = await createPharmacistToken();
    await Supplier.create(Array.from({ length: 4 }, (_, index) => ({ name: `Page Supplier ${index + 1}` })));
    const response = await request(app)
      .get("/api/suppliers?page=2&limit=2&search=Page")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.pagination).toEqual({ page: 2, limit: 2, total: 4, pages: 2 });
  });

  it("records expiry incidents once and changes expired batch status", async () => {
    const supplier = await Supplier.create({ name: "Expiry Supplier" });
    const drug = await Drug.create({ name: "Expiry Medicine", unitPrice: 2 });
    const expiredBatch = await Batch.create({
      drug: drug._id, supplier: supplier._id, batchNumber: "EXPIRED",
      manufactureDate: new Date("2025-01-01"), expiryDate: new Date(Date.now() - 86400000),
      quantityReceived: 5, quantityInStock: 5, status: "active",
    });
    await Batch.create({
      drug: drug._id, supplier: supplier._id, batchNumber: "NEAR-EXPIRY",
      manufactureDate: new Date("2025-01-01"), expiryDate: new Date(Date.now() + 10 * 86400000),
      quantityReceived: 4, quantityInStock: 4,
    });

    const firstRun = await runExpiryCheck("test");
    expect(firstRun.checked).toBe(2);
    expect(firstRun.incidents.map((incident) => incident.type).sort()).toEqual(["EXPIRED", "NEAR_EXPIRY"]);
    expect((await Batch.findById(expiredBatch._id)).status).toBe("expired");
    const secondRun = await runExpiryCheck("test");
    expect(secondRun.incidents).toHaveLength(2);
    expect(await Incident.countDocuments()).toBe(2);
    expect(await Notification.countDocuments()).toBe(2);
  });

  it("creates low-stock and stockout incidents and skips healthy or missing drugs", async () => {
    const supplier = await Supplier.create({ name: "Stock Check Supplier" });
    const lowDrug = await Drug.create({ name: "Low Medicine", unitPrice: 2, reorderThreshold: 10 });
    const lowBatch = await Batch.create({
      drug: lowDrug._id, supplier: supplier._id, batchNumber: "LOW",
      manufactureDate: new Date("2025-01-01"), expiryDate: new Date("2028-01-01"),
      quantityReceived: 5, quantityInStock: 5,
    });
    expect((await checkDrugStock(lowDrug._id, "test"))[0].type).toBe("LOW_STOCK");
    await Batch.updateOne({ _id: lowBatch._id }, { quantityInStock: 0, status: "depleted" });
    expect((await checkDrugStock(lowDrug._id, "test"))[0].type).toBe("STOCKOUT");

    const healthyDrug = await Drug.create({ name: "Healthy Medicine", unitPrice: 2, reorderThreshold: 2 });
    await Batch.create({
      drug: healthyDrug._id, supplier: supplier._id, batchNumber: "HEALTHY",
      manufactureDate: new Date("2025-01-01"), expiryDate: new Date("2028-01-01"),
      quantityReceived: 20, quantityInStock: 20,
    });
    const noBatchDrug = await Drug.create({ name: "No Batch Medicine", unitPrice: 2 });
    expect(await checkDrugStock(healthyDrug._id, "test")).toEqual([]);
    expect(await checkDrugStock(noBatchDrug._id, "test")).toEqual([]);
    expect(await checkDrugStock(new mongoose.default.Types.ObjectId(), "test")).toEqual([]);
  });

  it("records supplier notifications and reports missing or unavailable email delivery", async () => {
    await expect(notifySupplier({
      supplierId: new mongoose.default.Types.ObjectId(), type: "incident",
      title: "Notice", message: "Test message",
    })).rejects.toMatchObject({ code: "SUPPLIER_NOT_FOUND" });

    const supplierWithoutEmail = await Supplier.create({ name: "No Email Supplier" });
    const notSent = await notifySupplier({
      supplierId: supplierWithoutEmail._id, type: "incident",
      title: "Notice", message: "Test message",
    });
    expect(notSent.emailStatus).toBe("not_sent");

    const supplierWithEmail = await Supplier.create({ name: "Email Supplier", email: "supplier@example.test" });
    const environmentKeys = ["NODE_ENV", "SMTP_HOST", "SMTP_PORT", "SMTP_FROM", "SMTP_USER", "SMTP_PASSWORD"];
    const originalEnvironment = Object.fromEntries(environmentKeys.map((key) => [key, process.env[key]]));
    for (const key of environmentKeys.slice(1)) delete process.env[key];
    process.env.NODE_ENV = "production";
    try {
      const failed = await notifySupplier({
        supplierId: supplierWithEmail._id, type: "incident",
        title: "<Notice>", message: "Email is not configured",
      });
      expect(failed.emailStatus).toBe("failed");
    } finally {
      for (const key of environmentKeys) {
        if (originalEnvironment[key] === undefined) delete process.env[key];
        else process.env[key] = originalEnvironment[key];
      }
    }
  });
});
