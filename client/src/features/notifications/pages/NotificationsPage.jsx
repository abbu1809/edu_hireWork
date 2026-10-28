import { useNavigate } from "react-router";
import { Bell, CheckCheck } from "lucide-react";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "../hooks/useNotifications";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import { DashboardHeader } from "@/shared/components/layout/DashboardLayout";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { formatDateTime } from "@/shared/utils/format";

const TYPE_BADGE = {
  APPLICATION: "badge-role",
  INTERVIEW: "badge-gold",
  KYC: "badge-verified",
  PAYMENT: "badge-verified",
  MATCH: "badge-gold",
  SYSTEM: "badge-pending",
};

export default function NotificationsPage() {
  useDocumentTitle("Notifications");
  const navigate = useNavigate();
  const query = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const items = query.data?.items || [];
  const unread = query.data?.unread || 0;

  const open = (n) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.link && n.link.startsWith("/")) navigate(n.link);
  };

  return (
    <div style={{ maxWidth: "860px", margin: "2rem auto 5rem", padding: "0 1.5rem" }}>
      <DashboardHeader
        title="Notifications"
        subtitle={unread ? `${unread} unread update${unread === 1 ? "" : "s"}` : "You're all caught up"}
        actions={
          unread > 0 && (
            <button className="btn btn-outline btn-sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
              <CheckCheck size={16} /> Mark all as read
            </button>
          )
        }
      />

      <QueryState query={query} loadingLabel="Loading notifications...">
        {items.length === 0 ? (
          <EmptyState icon={Bell} title="No Notifications Yet">
            Application updates, demo schedules, KYC decisions and announcements will appear here.
          </EmptyState>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem", listStyle: "none", padding: 0 }}>
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className="card"
                  onClick={() => open(n)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                    padding: "1rem 1.25rem",
                    borderLeft: n.read ? "4px solid transparent" : "4px solid var(--color-brand-accent)",
                    background: n.read ? "var(--color-surface-white)" : "var(--color-brand-light-tint)",
                    font: "inherit",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: n.read ? 600 : 700, color: "var(--text-primary)" }}>{n.title}</div>
                    <span className={`badge ${TYPE_BADGE[n.type] || "badge-role"}`}>{n.type}</span>
                  </div>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: "0.35rem 0" }}>{n.message}</p>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{formatDateTime(n.created_at)}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </div>
  );
}
