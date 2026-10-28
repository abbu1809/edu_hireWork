import { http, unwrap, unwrapWithMeta } from "@/shared/api/httpClient";

// `entity` is "teachers" or "institutes".
export const adminApi = {
  stats: () => unwrap(http.get("/admin/stats")),

  teachers: () => unwrap(http.get("/admin/teachers")),
  institutes: () => unwrap(http.get("/admin/institutes")),
  verify: ({ entity, id, status, reason, notes }) => unwrap(http.post(`/admin/${entity}/${id}/verify`, { status, reason, notes })),
  feature: ({ entity, id, feature }) => unwrap(http.post(`/admin/${entity}/${id}/feature`, { feature })),
  archive: ({ entity, id, archive }) => unwrap(http.post(`/admin/${entity}/${id}/archive`, { archive })),
  flag: ({ entity, id, flagged, notes }) => unwrap(http.post(`/admin/${entity}/${id}/flag`, { flagged, notes })),

  vacancies: () => unwrap(http.get("/admin/vacancies")),
  applications: () => unwrap(http.get("/admin/applications")),
  matchmake: (payload) => http.post("/admin/matchmake", payload).then((res) => res.data),
  broadcast: (payload) => unwrap(http.post("/admin/broadcast", payload)),

  payments: () => unwrap(http.get("/admin/payments")),

  blog: () => unwrap(http.get("/admin/blog")),
  createPost: (payload) => unwrap(http.post("/admin/blog", payload)),
  updatePost: ({ id, ...payload }) => unwrap(http.put(`/admin/blog/${id}`, payload)),
  deletePost: (id) => http.delete(`/admin/blog/${id}`),

  emailStatus: () => unwrap(http.get("/admin/email/status")),
  emailTest: (to) => http.post("/admin/email/test", { to }).then((res) => res.data),
  emailBroadcast: (payload) => http.post("/admin/email/broadcast", payload).then((res) => res.data),
  emailBroadcasts: () => unwrap(http.get("/admin/email/broadcasts")),
  subscribers: () => unwrapWithMeta(http.get("/admin/subscribers")),

  inquiries: () => unwrap(http.get("/admin/inquiries")),
  updateInquiry: ({ id, status }) => unwrap(http.patch(`/admin/inquiries/${id}`, { status })),
  auditLogs: () => unwrap(http.get("/admin/audit-logs")),
};
