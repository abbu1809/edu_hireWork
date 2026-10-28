import { http, unwrapWithMeta } from "@/shared/api/httpClient";

export const notificationsApi = {
  list: () => unwrapWithMeta(http.get("/notifications")),
  markRead: (id) => http.patch(`/notifications/${id}/read`),
  markAllRead: () => http.patch("/notifications/read-all"),
};
