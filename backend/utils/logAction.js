import AuditLog from "../models/AuditLog.js";

const logAction = async ({ userId, action, entityType, entityId, details }) => {
  await AuditLog.create({ user: userId, action, entityType, entityId, details });
};

export default logAction;
