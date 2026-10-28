import { http, unwrap } from "@/shared/api/httpClient";

export const siteApi = {
  stats: () => unwrap(http.get("/stats")),
  settings: () => unwrap(http.get("/settings")),
  institutes: (params) => unwrap(http.get("/institutes", { params })),
  contact: (payload) => unwrap(http.post("/contact", payload)),
  subscribe: (payload) => http.post("/subscribe", payload).then((res) => res.data),
  unsubscribe: (token) => http.post("/unsubscribe", { token }).then((res) => res.data),
};
