import AuditLog from "../models/AuditLog.js";

const logAction = async ({ userId, action, entityType, entityId, details }) => {
  try {
    await AuditLog.create({ user: userId, action, entityType, entityId, details });
  } catch (err) {
    // Audit logging should never break the main request flow
    console.error("Audit log failed:", err.message);
  }
};

export default logAction;
