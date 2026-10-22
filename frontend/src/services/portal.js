import api from "../api/axios";

export const portalService = {
  inbox: async () => (await api.get("/portal/inbox")).data,
  respondToInquiry: async ({ id, ...payload }) => (await api.post(`/inquiries/${id}/respond`, payload)).data,
  respondToIncident: async ({ id, response }) => (await api.post(`/incidents/${id}/respond`, { response })).data,
};
