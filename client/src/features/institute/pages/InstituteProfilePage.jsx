import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUpdateInstituteProfile } from "../hooks/useInstitute";
import { DashboardHeader } from "@/shared/components/layout/DashboardLayout";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { notify } from "@/shared/utils/notify";
import ActiveSessions from "@/features/auth/components/ActiveSessions";

const FIELDS = [
  ["institute_name", "Institute / Coaching Name", "text", "organization"],
  ["tagline", "Tagline", "text"],
  ["institute_type", "Institute Type", "text"],
  ["contact_person", "Contact Person", "text", "name"],
  ["phone", "Contact Phone", "tel", "tel"],
  ["website", "Website", "url", "url"],
  ["city", "Headquarters / Main Campus City", "text", "address-level2"],
  ["state", "State", "text", "address-level1"],
  ["location", "Campus Address", "text", "street-address"],
  ["student_count", "Student Strength", "text"],
  ["faculty_count", "Faculty Count", "text"],
  ["established_year", "Established Year", "text"],
];

const toForm = (user) => Object.fromEntries([...FIELDS.map(([key]) => key), "description"].map((key) => [key, user?.[key] ?? ""]));

export default function InstituteProfilePage() {
  useDocumentTitle("Institute Profile");
  const { currentUser } = useAuth();
  const update = useUpdateInstituteProfile();
  const [form, setForm] = useState(() => toForm(currentUser));

  useEffect(() => {
    setForm(toForm(currentUser));
  }, [currentUser?.id, currentUser?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e) => {
    e.preventDefault();
    if (String(form.institute_name).trim().length < 2) return notify.error("Please enter the institute name.");
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]));
    update.mutate(payload, {
      onSuccess: () => notify.success("Institute profile updated successfully."),
      onError: (error) => notify.apiError(error, "Failed to update profile."),
    });
  };

  return (
    <div>
      <DashboardHeader title="Institute Profile & Campuses" subtitle="Manage your organizational details, accreditations, and contact points" />

      <div className="card" style={{ maxWidth: "820px" }}>
        <h3 className="card-title" style={{ marginBottom: "1.25rem" }}>
          Organization Details
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
            {FIELDS.map(([key, label, type, autoComplete]) => (
              <div className="form-group" key={key}>
                <label className="form-label" htmlFor={`ip-${key}`}>
                  {label}
                </label>
                <input
                  id={`ip-${key}`}
                  type={type}
                  className="input-field"
                  autoComplete={autoComplete}
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ip-email">
              Official Contact Email
            </label>
            <input id="ip-email" type="email" className="input-field" value={currentUser?.email || ""} disabled />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="ip-description">
              About the Institute
            </label>
            <textarea
              id="ip-description"
              className="input-field"
              rows={4}
              placeholder="Courses, results, teaching culture, campuses..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={update.isPending}>
            {update.isPending ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>

      <div className="card" style={{ maxWidth: "820px", marginTop: "1.5rem" }}>
        <h3 className="card-title" style={{ marginBottom: "1.25rem" }}>
          Email Notifications
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {[
            ["email_notifications_enabled", "Applicant & hiring emails", "New applications and mediator recommendations"],
            ["marketing_emails_enabled", "Newsletter & announcements", "Recruiter guides, hiring trends and platform news"],
          ].map(([key, title, hint]) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
              <div>
                <div style={{ fontWeight: 600 }}>{title}</div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{hint}</div>
              </div>
              <input
                type="checkbox"
                role="switch"
                className="switch"
                aria-label={title}
                checked={currentUser?.[key] !== false}
                disabled={update.isPending}
                onChange={(e) =>
                  update.mutate(
                    { [key]: e.target.checked },
                    {
                      onSuccess: () => notify.success("Email preferences saved."),
                      onError: (error) => notify.apiError(error, "Could not save preferences."),
                    }
                  )
                }
              />
            </div>
          ))}
        </div>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "1rem" }}>
          Security and payment receipts are always sent.
        </p>
      </div>

      <div style={{ maxWidth: "820px", marginTop: "1.5rem" }}>
        <ActiveSessions />
      </div>
    </div>
  );
}
