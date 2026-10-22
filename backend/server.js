import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import compression from "compression";
import pino from "pino";
import pinoHttp from "pino-http";
import cron from "node-cron";
import mongoose from "mongoose";
import connectDB from "./config/db.js";
import { validateEnvironment } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import authRoutes from "./routes/authRoutes.js";
import drugRoutes from "./routes/drugRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import batchRoutes from "./routes/batchRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import incidentRoutes from "./routes/incidentRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import requestRoutes from "./routes/requestRoutes.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";
import portalRoutes from "./routes/portalRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import { runExpiryCheck } from "./services/expiryService.js";
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "./config/openapi.js";

let config;
try {
  config = validateEnvironment();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const logger = pino({
  level: process.env.LOG_LEVEL || (config.NODE_ENV === "production" ? "info" : "debug"),
  redact: ["req.headers.authorization", "req.headers.cookie", "password", "token"],
});
const app = express();
const allowedOrigins = config.CLIENT_URL.split(",").map((origin) => origin.trim());

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Origin is not allowed by CORS"));
    }
  },
}));
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(mongoSanitize());
app.use(pinoHttp({
  logger,
  serializers: {
    req(req) {
      return { method: req.method, url: req.url, remoteAddress: req.remoteAddress };
    },
  },
}));

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many requests", code: "RATE_LIMITED" },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many authentication attempts", code: "RATE_LIMITED" },
});
app.use("/api", generalLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    version: process.env.npm_package_version || "1.0.0",
  });
});
app.get("/api/docs.json", (req, res) => res.json(openApiSpec));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.use("/api/auth", authRoutes);
app.use("/api/drugs", drugRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/portal", portalRoutes);
app.use("/api/users", userRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/reports", reportRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

let server;
async function start() {
  await connectDB();
  logger.info("MongoDB connected");
  await runExpiryCheck("system");
  cron.schedule("0 8 * * *", () => {
    runExpiryCheck("system").catch((error) => logger.error({ err: error }, "Scheduled expiry check failed"));
  });
  server = app.listen(config.PORT, () => logger.info({ port: config.PORT }, "Server listening"));
}

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Graceful shutdown started");
  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "Graceful shutdown failed");
    process.exit(1);
  }
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

if (process.env.NODE_ENV !== "test") {
  start().catch((error) => {
    logger.fatal({ err: error }, "Server startup failed");
    process.exit(1);
  });
}

export default app;
