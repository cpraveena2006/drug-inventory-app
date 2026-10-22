import api from "../api/axios";

export const adminService = {
  users: async () => (await api.get("/users")).data,
  createUser: async (payload) => (await api.post("/users", payload)).data,
  updateUser: async ({ id, ...payload }) => (await api.patch(`/users/${id}`, payload)).data,
  auditLogs: async (params) => (await api.get("/audit-logs", { params })).data,
};
