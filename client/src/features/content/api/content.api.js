import { http, unwrap } from "@/shared/api/httpClient";

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== "ALL"));

export const contentApi = {
  list: (filters) => unwrap(http.get("/blog", { params: clean(filters) })),
  getBySlug: (slug) => unwrap(http.get(`/blog/${encodeURIComponent(slug)}`)),
  recordView: (slug) => http.post(`/blog/${encodeURIComponent(slug)}/view`),
};
