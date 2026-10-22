import nodemailer from "nodemailer";
import Notification from "../models/Notification.js";
import Supplier from "../models/Supplier.js";
import AppError from "../utils/AppError.js";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

async function sendSupplierEmail(supplier, title, message) {
  if (!supplier.email) return "not_sent";

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, NODE_ENV } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_FROM) {
    if (NODE_ENV !== "production") {
      console.info(`[supplier-email preview] To: ${supplier.email}; Subject: ${title}; ${message}`);
      return "not_sent";
    }
    return "failed";
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      ...(SMTP_USER ? { auth: { user: SMTP_USER, pass: SMTP_PASSWORD } } : {}),
    });
    await transporter.sendMail({
      from: SMTP_FROM,
      to: supplier.email,
      subject: title,
      text: message,
      html: `<main style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message)}</p><p>Sign in to the Drug Inventory Supplier Portal to respond.</p></main>`,
    });
    return "sent";
  } catch (error) {
    console.error("Supplier email delivery failed:", error.message);
    return "failed";
  }
}

export async function notifySupplier({ supplierId, type, title, message, relatedModel, relatedId }) {
  const supplier = await Supplier.findOne({ _id: supplierId, isDeleted: { $ne: true } });
  if (!supplier) throw new AppError("Supplier not found", 404, "SUPPLIER_NOT_FOUND");

  const notification = await Notification.create({
    recipientSupplier: supplier._id,
    type,
    title,
    message,
    relatedModel,
    relatedId,
  });
  const emailStatus = await sendSupplierEmail(supplier, title, message);
  if (emailStatus !== "not_sent") {
    notification.emailStatus = emailStatus;
    await notification.save();
  }
  return notification;
}
