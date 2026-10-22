import api from "../api/axios";

export const insightService = {
  drug: async (id) => (await api.get(`/drugs/${id}/insights`)).data,
  batch: async (id) => (await api.get(`/batches/${id}/details`)).data,
  supplier: async (id) => (await api.get(`/suppliers/${id}/scorecard`)).data,
  reorderSuggestions: async () => (await api.get("/reports/reorder-suggestions")).data,
  reportDamage: async ({ id, ...payload }) => (await api.post(`/batches/${id}/report-damage`, payload)).data,
  updateQuality: async ({ id, ...payload }) => (await api.patch(`/batches/${id}/quality`, payload)).data,
  createIncident: async (payload) => (await api.post("/incidents", payload)).data,
};
