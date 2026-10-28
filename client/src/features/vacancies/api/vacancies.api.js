import { http, unwrap } from "@/shared/api/httpClient";

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));

export const vacanciesApi = {
  listActive: (filters) => unwrap(http.get("/vacancies", { params: clean(filters) })),
  getById: (id) => unwrap(http.get(`/vacancies/${id}`)),
  listMine: () => unwrap(http.get("/vacancies/mine")),
  create: (payload) => unwrap(http.post("/vacancies", payload)),
  update: (id, payload) => unwrap(http.put(`/vacancies/${id}`, payload)),
  remove: (id) => http.delete(`/vacancies/${id}`),
};
