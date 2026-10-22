import Notification from "../models/Notification.js";
import AppError from "../utils/AppError.js";

function recipientFilter(user) {
  return user.role === "supplier"
    ? { recipientSupplier: user.supplier }
    : { recipientUser: user._id };
}

export async function getNotifications(req, res) {
  const filter = recipientFilter(req.user);
  const [items, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(100),
    Notification.countDocuments({ ...filter, readAt: null }),
  ]);
  res.json({ items, unreadCount });
}

export async function getUnreadCount(req, res) {
  const unreadCount = await Notification.countDocuments({
    ...recipientFilter(req.user),
    readAt: null,
  });
  res.json({ unreadCount });
}

export async function markNotificationRead(req, res) {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, ...recipientFilter(req.user) },
    { $set: { readAt: new Date() } },
    { new: true }
  );
  if (!notification) throw new AppError("Notification not found", 404, "NOT_FOUND");
  res.json(notification);
}

export async function markAllNotificationsRead(req, res) {
  const result = await Notification.updateMany(
    { ...recipientFilter(req.user), readAt: null },
    { $set: { readAt: new Date() } }
  );
  res.json({ updated: result.modifiedCount });
}
