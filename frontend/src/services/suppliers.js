import api from "../api/axios";

export const supplierService = {
  list: async () => (await api.get("/suppliers")).data,
  leaderboard: async () => (await api.get("/suppliers/leaderboard")).data,
};
