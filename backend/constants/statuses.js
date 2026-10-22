export const BATCH_STATUSES = Object.freeze([
  "active",
  "expired",
  "recalled",
  "depleted",
  "quarantined",
]);

export const ORDER_STATUSES = Object.freeze([
  "pending",
  "approved",
  "shipped",
  "delivered",
  "cancelled",
]);

export const INCIDENT_TYPES = Object.freeze([
  "STOCKOUT",
  "LOW_STOCK",
  "DAMAGED",
  "EXPIRED",
  "NEAR_EXPIRY",
  "RECALLED",
  "QUALITY_ISSUE",
]);
