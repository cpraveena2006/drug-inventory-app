import api from "../api/axios";

export const incidentService = {
  list: async (params = {}) => (await api.get("/incidents", { params })).data,
  updateStatus: async ({ id, ...payload }) => (await api.patch(`/incidents/${id}/status`, payload)).data,
  notifySupplier: async (id) => (await api.post(`/incidents/${id}/notify`)).data,
};
