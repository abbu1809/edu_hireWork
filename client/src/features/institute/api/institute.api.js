import { http, unwrap, unwrapWithMeta } from "@/shared/api/httpClient";

const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""));

export const instituteApi = {
  updateProfile: (payload) => unwrap(http.put("/institutes/me", payload)),
  /** Talent pool with `is_unlocked`, plus phone/email for unlocked teachers. */
  talent: (filters) => unwrapWithMeta(http.get("/institutes/me/talent", { params: clean(filters) })),
  unlocked: () => unwrap(http.get("/institutes/me/unlocked")),

  receivedApplications: () => unwrap(http.get("/applications/received")),
  updateApplicationStatus: ({ id, status }) => unwrap(http.patch(`/applications/${id}/status`, { status })),

  interviews: () => unwrap(http.get("/interviews/mine")),
  scheduleInterview: (payload) => unwrap(http.post("/interviews", payload)),
};
