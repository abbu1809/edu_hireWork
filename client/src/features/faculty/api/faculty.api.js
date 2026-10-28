import { http, unwrap } from "@/shared/api/httpClient";

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== false));

/** Public faculty directory: safe professional fields only (no contact details). */
export const facultyApi = {
  list: (filters) => unwrap(http.get("/teachers", { params: clean(filters) })),
  getById: (id) => unwrap(http.get(`/teachers/${id}`)),
};
