import { useEffect, useState } from "react";
import { Send, Inbox, ScrollText, Wrench, Power } from "lucide-react";
import { useAdminAuditLogs, useAdminInquiries, useBroadcast, useUpdateInquiry, useUpdateSetting } from "../hooks/useAdmin";
import { usePlatformSettings } from "@/features/site/hooks/useSite";
import { DashboardHeader } from "@/shared/components/layout/DashboardLayout";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { notify } from "@/shared/utils/notify";
import { formatDateTime } from "@/shared/utils/format";
import ActiveSessions from "@/features/auth/components/ActiveSessions";

const INQUIRY_BADGE = { NEW: "badge-gold", IN_PROGRESS: "badge-pending", RESOLVED: "badge-verified" };

export default function AdminGovernancePage() {
  useDocumentTitle("Governance & Broadcast");
  const broadcast = useBroadcast();
  const inquiriesQuery = useAdminInquiries();
  const auditQuery = useAdminAuditLogs();
  const updateInquiry = useUpdateInquiry();
  const { data: settings } = usePlatformSettings();
  const updateSetting = useUpdateSetting();

  const isMaintenance = settings?.maintenance_mode === true || settings?.maintenance_mode === "true";
  const [maintenanceMsg, setMaintenanceMsg] = useState("");

  useEffect(() => {
    if (typeof settings?.maintenance_message === "string") {
      setMaintenanceMsg(settings.maintenance_message);
    }
  }, [settings?.maintenance_message]);

  const handleToggleMaintenance = () => {
    const next = !isMaintenance;
    updateSetting.mutate(
      {
        key: "maintenance_mode",
        value: next,
        description: "When true, only admins can access the platform",
      },
      {
        onSuccess: () => notify.success(next ? "Maintenance Mode enabled. Only admins can access the site." : "Maintenance Mode disabled. Site is now live for everyone."),
        onError: (error) => notify.apiError(error, "Could not update maintenance mode."),
      }
    );
  };

  const handleSaveMaintenanceMessage = (e) => {
    e.preventDefault();
    updateSetting.mutate(
      {
        key: "maintenance_message",
        value: maintenanceMsg.trim() || "FacultyKart is currently undergoing scheduled maintenance. We will be back shortly.",
        description: "Message shown to visitors during maintenance",
      },
      {
        onSuccess: () => notify.success("Maintenance message updated."),
        onError: (error) => notify.apiError(error, "Could not update maintenance message."),
      }
    );
  };

  const [target, setTarget] = useState("TEACHER");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const handleBroadcast = (e) => {
    e.preventDefault();
    if (!message.trim()) return notify.error("Please type an announcement message.");
    broadcast.mutate(
      { targetRole: target, title: title.trim() || undefined, message: message.trim() },
      {
        onSuccess: (result) => {
          notify.success(`Broadcast delivered to ${result?.count ?? 0} user(s).`);
          setTitle("");
          setMessage("");
        },
        onError: (error) => notify.apiError(error, "Broadcast failed."),
      }
    );
  };

  const inquiries = inquiriesQuery.data || [];
  const logs = auditQuery.data || [];

  return (
    <div>
      <DashboardHeader title="Platform Governance & Mass Broadcast" subtitle="Manage maintenance mode, send system announcements, answer inquiries and review audit logs" />

      {/* Maintenance Mode Card (Admin-only control) */}
      <div
        className="card"
        style={{
          marginBottom: "2rem",
          borderLeft: `4px solid ${isMaintenance ? "#dc2626" : "var(--color-brand-accent)"}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
              <Wrench size={20} color={isMaintenance ? "#dc2626" : "var(--color-brand-house)"} />
              <h3 className="card-title" style={{ margin: 0 }}>
                Maintenance Mode
              </h3>
              <span className={`badge ${isMaintenance ? "badge-rejected" : "badge-verified"}`}>
                {isMaintenance ? "MAINTENANCE ACTIVE" : "SITE LIVE"}
              </span>
            </div>
            <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginTop: "0.35rem" }}>
              When enabled, visitors, teachers, and institutes see the maintenance screen and API requests are paused. Administrators retain full access to the entire platform.
            </p>
          </div>
          <button
            type="button"
            className={`btn ${isMaintenance ? "btn-primary" : "btn-danger-outline"}`}
            onClick={handleToggleMaintenance}
            disabled={updateSetting.isPending}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
          >
            <Power size={16} />
            {updateSetting.isPending ? "Updating..." : isMaintenance ? "Disable Maintenance Mode" : "Enable Maintenance Mode"}
          </button>
        </div>

        <form onSubmit={handleSaveMaintenanceMessage} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 320px" }}>
            <label className="form-label" htmlFor="maint-msg">
              Visitor Maintenance Message
            </label>
            <input
              id="maint-msg"
              type="text"
              className="input-field"
              placeholder="FacultyKart is currently undergoing scheduled maintenance. We will be back shortly."
              value={maintenanceMsg}
              onChange={(e) => setMaintenanceMsg(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-outline" disabled={updateSetting.isPending}>
            Save Message
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2" style={{ marginBottom: "2rem" }}>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "1.25rem" }}>
            Send Mass Broadcast Notification
          </h3>
          <form onSubmit={handleBroadcast}>
            <div className="form-group">
              <label className="form-label" htmlFor="bc-target">
                Target Audience
              </label>
              <select id="bc-target" className="input-select" style={{ width: "100%" }} value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="TEACHER">All Registered Teachers</option>
                <option value="INSTITUTE">All Partner Institutes</option>
                <option value="ALL">Everyone (Teachers & Institutes)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="bc-title">
                Title (optional)
              </label>
              <input id="bc-title" type="text" className="input-field" placeholder="Announcement from FacultyKart" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="bc-message">
                Message Content
              </label>
              <textarea id="bc-message" className="input-field" rows={4} placeholder="Type announcement message..." value={message} onChange={(e) => setMessage(e.target.value)} required />
            </div>

            <button type="submit" className="btn btn-primary" disabled={broadcast.isPending} style={{ width: "100%" }}>
              <Send size={16} /> {broadcast.isPending ? "Dispatching..." : "Send Broadcast"}
            </button>
          </form>
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "1.25rem" }}>
            Contact Inquiries
          </h3>
          <QueryState query={inquiriesQuery} loadingLabel="Loading inquiries...">
            {inquiries.length === 0 ? (
              <EmptyState bare icon={Inbox} iconSize={24} title="No Inquiries Yet">
                Messages sent from the Contact page will appear here.
              </EmptyState>
            ) : (
              <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem", listStyle: "none", padding: 0, maxHeight: "420px", overflowY: "auto" }}>
                {inquiries.map((q) => (
                  <li key={q.id} style={{ background: "var(--color-canvas-warm)", borderRadius: "8px", padding: "0.75rem 1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
                      <strong>
                        {q.name} {q.role && <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>· {q.role}</span>}
                      </strong>
                      <span className={`badge ${INQUIRY_BADGE[q.status] || "badge-role"}`}>{q.status}</span>
                    </div>
                    <a href={`mailto:${q.email}`} style={{ fontSize: "0.82rem", color: "var(--color-brand-accent)" }}>
                      {q.email}
                    </a>
                    <p style={{ fontSize: "0.88rem", margin: "0.4rem 0", whiteSpace: "pre-line" }}>{q.message}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{formatDateTime(q.created_at)}</span>
                      <select
                        className="input-select input-compact"
                        aria-label={`Status for inquiry from ${q.name}`}
                        value={q.status}
                        onChange={(e) =>
                          updateInquiry.mutate({ id: q.id, status: e.target.value }, { onError: (error) => notify.apiError(error, "Could not update inquiry.") })
                        }
                      >
                        <option value="NEW">New</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title" style={{ marginBottom: "1.25rem" }}>
          Verification Audit Log
        </h3>
        <QueryState query={auditQuery} loadingLabel="Loading audit log...">
          {logs.length === 0 ? (
            <EmptyState bare icon={ScrollText} iconSize={24} title="No Audit Entries Yet">
              Verification, feature, archive and flag actions are recorded here.
            </EmptyState>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Entity</th>
                    <th>Action</th>
                    <th>By</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 100).map((log) => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(log.created_at)}</td>
                      <td>
                        <span className="badge badge-role">{log.entity_type}</span>
                      </td>
                      <td>{log.action}{log.metadata?.status ? ` → ${log.metadata.status}` : ""}</td>
                      <td>{log.performed_by_email || "—"}</td>
                      <td>{log.reason || log.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
      </div>

      <div style={{ marginTop: "1.5rem", maxWidth: "820px" }}>
        <ActiveSessions />
      </div>
    </div>
  );
}
