import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router";
import { Bell, CheckCheck, X, ExternalLink } from "lucide-react";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "../hooks/useNotifications";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import { formatDateTime } from "@/shared/utils/format";

const TYPE_BADGE = {
  APPLICATION: "badge-role",
  INTERVIEW: "badge-gold",
  KYC: "badge-verified",
  PAYMENT: "badge-verified",
  MATCH: "badge-gold",
  SYSTEM: "badge-pending",
};

export default function NotificationDrawer({ open, onClose }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all"); // "all" | "unread"
  const query = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const items = query.data?.items || [];
  const unread = query.data?.unread || 0;
  const visible = filter === "unread" ? items.filter((n) => !n.read) : items;

  const handleOpenItem = (n) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.link && n.link.startsWith("/")) {
      onClose();
      navigate(n.link);
    }
  };

  return createPortal(
    <div
      className="drawer-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="drawer-panel">
        {/* Header */}
        <div
          style={{
            padding: "1.15rem 1.25rem",
            borderBottom: "1px solid var(--color-canvas-ceramic)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.75rem",
            background: "var(--color-surface-white)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
            <Bell size={19} color="var(--color-brand-house)" aria-hidden="true" />
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--color-brand-house)" }}>
              Notifications
            </h2>
            {unread > 0 && (
              <span className="badge badge-gold" style={{ fontSize: "0.72rem" }}>
                {unread} new
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {unread > 0 && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                style={{ padding: "0.3rem 0.6rem", fontSize: "0.78rem" }}
              >
                <CheckCheck size={14} /> Read all
              </button>
            )}
            <button
              type="button"
              className="btn-icon"
              onClick={onClose}
              aria-label="Close notifications"
              style={{ background: "var(--color-canvas-warm)", border: "none", cursor: "pointer" }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div
          style={{
            padding: "0.65rem 1.25rem",
            borderBottom: "1px solid var(--color-canvas-ceramic)",
            display: "flex",
            gap: "0.5rem",
            background: "var(--color-canvas-warm)",
          }}
        >
          <button
            type="button"
            className={`btn btn-sm ${filter === "all" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setFilter("all")}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${filter === "unread" ? "btn-primary" : "btn-outline"}`}
            onClick={() => setFilter("unread")}
          >
            Unread ({unread})
          </button>
        </div>

        {/* Scrollable List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.15rem" }}>
          <QueryState query={query} loadingLabel="Loading notifications...">
            {visible.length === 0 ? (
              <EmptyState bare icon={Bell} iconSize={26} title={filter === "unread" ? "All Caught Up" : "No Notifications Yet"}>
                {filter === "unread"
                  ? "You have no unread notifications."
                  : "Application updates, demo schedules, KYC decisions and announcements will appear here."}
              </EmptyState>
            ) : (
              <ul style={{ display: "flex", flexDirection: "column", gap: "0.65rem", listStyle: "none", padding: 0, margin: 0 }}>
                {visible.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleOpenItem(n)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        cursor: "pointer",
                        padding: "0.85rem 1rem",
                        borderRadius: "10px",
                        border: "1px solid var(--color-canvas-ceramic)",
                        borderLeft: n.read ? "4px solid transparent" : "4px solid var(--color-brand-accent)",
                        background: n.read ? "var(--color-surface-white)" : "var(--color-brand-light-tint)",
                        font: "inherit",
                        transition: "background 0.15s ease",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "flex-start" }}>
                        <div style={{ fontWeight: n.read ? 600 : 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                          {n.title}
                        </div>
                        <span className={`badge ${TYPE_BADGE[n.type] || "badge-role"}`} style={{ fontSize: "0.68rem", flexShrink: 0 }}>
                          {n.type}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)", margin: "0.3rem 0 0.4rem", lineHeight: 1.45 }}>
                        {n.message}
                      </p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.73rem", color: "var(--text-muted)" }}>
                        <span>{formatDateTime(n.created_at)}</span>
                        {n.link && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", color: "var(--color-brand-accent)", fontWeight: 600 }}>
                            Open <ExternalLink size={11} />
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "0.75rem 1.25rem",
            borderTop: "1px solid var(--color-canvas-ceramic)",
            textAlign: "center",
            background: "var(--color-surface-white)",
          }}
        >
          <Link
            to="/notifications"
            onClick={onClose}
            style={{ fontSize: "0.83rem", fontWeight: 600, color: "var(--color-brand-accent)" }}
          >
            View full notifications page →
          </Link>
        </div>
      </aside>
    </div>,
    document.body
  );
}
