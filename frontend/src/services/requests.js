import api from "../api/axios";

export const requestService = {
  list: async () => (await api.get("/requests")).data,
  inquiries: async (drugRequestId) => (await api.get("/inquiries", { params: { drugRequestId } })).data,
  topDemand: async (days = 30) => (await api.get("/requests/analytics/top-demand", { params: { days } })).data,
  create: async (payload) => (await api.post("/requests", payload)).data,
  createInquiry: async (payload) => (await api.post("/inquiries", payload)).data,
  chooseSupplier: async ({ id, supplierId }) => (await api.post(`/inquiries/${id}/choose`, { supplierId })).data,
};
