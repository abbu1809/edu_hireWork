import { useState } from "react";
import { useTeacherPreferences, useUpdateTeacherPreferences } from "../hooks/useTeacher";
import { authApi } from "@/features/auth/api/auth.api";
import { PasswordInput } from "@/features/auth/components/AuthFormParts";
import ActiveSessions from "@/features/auth/components/ActiveSessions";
import { DashboardHeader } from "@/shared/components/layout/DashboardLayout";
import QueryState from "@/shared/components/QueryState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { notify } from "@/shared/utils/notify";

const TOGGLES = [
  { key: "job_alerts_enabled", title: "Instant Job Alerts", hint: "Get notified when matching coaching vacancies open" },
  { key: "application_updates_enabled", title: "Application Updates", hint: "Status changes on the roles you applied to" },
  { key: "interview_notifications_enabled", title: "Demo & Interview Alerts", hint: "New demo lecture schedules and reminders" },
  { key: "employer_interest_enabled", title: "Employer Interest", hint: "When an institute shortlists or unlocks your profile" },
  { key: "marketing_emails_enabled", title: "Newsletter & Announcements", hint: "Hiring trends, career guides and platform news by email" },
];

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <input
      type="checkbox"
      role="switch"
      aria-label={label}
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange(e.target.checked)}
      className="switch"
    />
  );
}

export default function TeacherSettingsPage() {
  useDocumentTitle("Account Settings");
  const query = useTeacherPreferences();
  const update = useUpdateTeacherPreferences();
  const prefs = query.data || {};

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const save = (changes) =>
    update.mutate(changes, {
      onSuccess: () => notify.success("Preferences saved."),
      onError: (error) => notify.apiError(error, "Could not save preferences."),
    });

  const handlePassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) return notify.error("New password must be at least 6 characters.");
    if (password !== confirm) return notify.error("Passwords do not match.");
    setSavingPassword(true);
    try {
      const res = await authApi.changePassword(password);
      notify.success(res.message || "Password updated successfully.");
      setPassword("");
      setConfirm("");
    } catch (error) {
      notify.apiError(error, "Failed to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div>
      <DashboardHeader title="Account Settings & Preferences" subtitle="Manage notification preferences, privacy visibility, and contact permissions" />

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "600px" }}>
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "1.25rem" }}>
            Privacy & Email Alerts
          </h3>
          <QueryState query={query} loadingLabel="Loading preferences...">
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                <div>
                  <div style={{ fontWeight: "600" }}>Profile Discoverability</div>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Allow verified coaching institutes to view your portfolio</div>
                </div>
                <Toggle
                  label="Profile Discoverability"
                  checked={prefs.profile_visibility !== "HIDDEN"}
                  disabled={update.isPending}
                  onChange={(on) => save({ profile_visibility: on ? "PUBLIC_VERIFIED_EMPLOYERS" : "HIDDEN" })}
                />
              </div>

              {TOGGLES.map((t) => (
                <div key={t.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                  <div>
                    <div style={{ fontWeight: "600" }}>{t.title}</div>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{t.hint}</div>
                  </div>
                  <Toggle label={t.title} checked={prefs[t.key] !== false} disabled={update.isPending} onChange={(on) => save({ [t.key]: on })} />
                </div>
              ))}
            </div>
          </QueryState>
        </div>

        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "1.25rem" }}>
            Change Password
          </h3>
          <form onSubmit={handlePassword}>
            <div className="form-group">
              <label className="form-label" htmlFor="ts-new">
                New Password
              </label>
              <PasswordInput id="ts-new" value={password} onChange={setPassword} autoComplete="new-password" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="ts-confirm">
                Confirm New Password
              </label>
              <PasswordInput id="ts-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={savingPassword}>
              {savingPassword ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

        <ActiveSessions />
      </div>
    </div>
  );
}
