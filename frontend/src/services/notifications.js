import api from "../api/axios";

export const notificationService = {
  list: async () => (await api.get("/notifications")).data,
  unreadCount: async () => (await api.get("/notifications/unread-count")).data,
  markRead: async (id) => (await api.patch(`/notifications/${id}/read`)).data,
  markAllRead: async () => (await api.patch("/notifications/read-all")).data,
};
