import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import { Monitor, Smartphone, Tablet, LogOut, ShieldCheck } from "lucide-react";
import { authApi } from "../api/auth.api";
import { logoutAllDevices, logoutUser } from "../store/authSlice";
import { useConfirm } from "@/shared/components/ConfirmDialog";
import QueryState from "@/shared/components/QueryState";
import { notify } from "@/shared/utils/notify";
import { formatDateTime } from "@/shared/utils/format";

const SESSIONS_KEY = ["auth", "sessions"];

/** "Chrome on Windows" style label + device icon from a user-agent string. */
const describeDevice = (ua = "") => {
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Unknown OS";
  const icon = /iPad|Tablet/.test(ua) ? Tablet : /Mobile|Android|iPhone/.test(ua) ? Smartphone : Monitor;
  return { label: ua ? `${browser} on ${os}` : "Unknown device", icon };
};

/** Lists the user's signed-in devices with per-device and bulk sign-out. */
export default function ActiveSessions() {
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const query = useQuery({ queryKey: SESSIONS_KEY, queryFn: authApi.sessions });
  const sessions = query.data || [];
  const others = sessions.filter((s) => !s.current);

  const refetch = () => queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });

  const revokeOne = useMutation({
    mutationFn: authApi.revokeSession,
    onSuccess: (res) => {
      notify.success(res.message);
      refetch();
    },
    onError: (error) => notify.apiError(error, "Could not sign out that session."),
  });

  const revokeOthers = useMutation({
    mutationFn: authApi.revokeOtherSessions,
    onSuccess: (res) => {
      notify.success(res.message);
      refetch();
    },
    onError: (error) => notify.apiError(error, "Could not sign out other sessions."),
  });

  const signOutCurrent = async () => {
    await dispatch(logoutUser());
    queryClient.clear();
    navigate("/");
  };

  const handleRevoke = async (session) => {
    if (session.current) {
      const ok = await confirm({ title: "Sign out of this device?", message: "You'll need to sign in again here.", confirmLabel: "Sign out", tone: "danger" });
      if (ok) await signOutCurrent();
      return;
    }
    const { label } = describeDevice(session.userAgent);
    const ok = await confirm({
      title: "Sign out this device?",
      message: `${label}${session.ipAddress ? ` (${session.ipAddress})` : ""} will be signed out immediately.`,
      confirmLabel: "Sign out device",
      tone: "danger",
    });
    if (ok) revokeOne.mutate(session.id);
  };

  const handleRevokeOthers = async () => {
    const ok = await confirm({
      title: "Sign out all other devices?",
      message: `${others.length} other session${others.length === 1 ? "" : "s"} will be signed out immediately. You'll stay signed in here.`,
      confirmLabel: "Sign out others",
      tone: "danger",
    });
    if (ok) revokeOthers.mutate();
  };

  const handleLogoutEverywhere = async () => {
    const ok = await confirm({
      title: "Sign out everywhere?",
      message: "Every device, including this one, will be signed out. Use this if you think someone else has access to your account.",
      confirmLabel: "Sign out everywhere",
      tone: "danger",
    });
    if (!ok) return;
    await dispatch(logoutAllDevices());
    queryClient.clear();
    notify.success("Signed out of all devices.");
    navigate("/auth?mode=login");
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <ShieldCheck size={18} color="var(--color-brand-green)" aria-hidden="true" /> Active Sessions
        </h3>
        {others.length > 0 && (
          <button type="button" className="btn btn-sm btn-danger-outline" onClick={handleRevokeOthers} disabled={revokeOthers.isPending}>
            Sign out other devices
          </button>
        )}
      </div>

      <QueryState query={query} loadingLabel="Loading sessions...">
        <ul style={{ listStyle: "none", display: "grid", gap: "0.6rem", marginBottom: "1rem" }}>
          {sessions.map((s) => {
            const { label, icon: Icon } = describeDevice(s.userAgent);
            return (
              <li
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.85rem",
                  padding: "0.75rem 0.9rem",
                  borderRadius: "var(--radius-sm)",
                  background: s.current ? "var(--color-brand-light-tint)" : "var(--color-canvas-warm)",
                  border: s.current ? "1px solid var(--color-brand-light)" : "1px solid transparent",
                }}
              >
                <span className="icon-circle" style={{ width: 38, height: 38 }} aria-hidden="true">
                  <Icon size={18} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    {label}
                    {s.current && <span className="badge badge-verified">This device</span>}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                    {s.ipAddress ? `${s.ipAddress} · ` : ""}Active {formatDateTime(s.lastUsedAt)} · Signed in {formatDateTime(s.createdAt)}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-icon"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-error)" }}
                  onClick={() => handleRevoke(s)}
                  disabled={revokeOne.isPending}
                  aria-label={`Sign out ${label}${s.current ? " (this device)" : ""}`}
                  title="Sign out"
                >
                  <LogOut size={17} />
                </button>
              </li>
            );
          })}
        </ul>
      </QueryState>

      <button type="button" className="btn btn-sm btn-dark-outline" onClick={handleLogoutEverywhere}>
        <LogOut size={15} aria-hidden="true" /> Sign out everywhere
      </button>
      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
        Sessions stay signed in for up to 30 days. Changing your password signs out all other devices.
      </p>
    </div>
  );
}
