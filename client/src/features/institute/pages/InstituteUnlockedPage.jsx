import { Link } from "react-router";
import { Unlock, Phone, Mail, FileText } from "lucide-react";
import { useUnlockedTeachers } from "../hooks/useInstitute";
import { TeacherAvatar } from "@/features/faculty/components/TeacherCard";
import { DashboardHeader } from "@/shared/components/layout/DashboardLayout";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { autoGrid } from "@/shared/utils/format";

export default function InstituteUnlockedPage() {
  useDocumentTitle("Unlocked Contacts");
  const query = useUnlockedTeachers();
  const teachers = query.data || [];

  return (
    <div>
      <DashboardHeader title="Unlocked Faculty Contacts" subtitle="Direct communication details and downloaded resumes" />

      <QueryState query={query} loadingLabel="Loading unlocked contacts...">
        {teachers.length === 0 ? (
          <EmptyState
            icon={Unlock}
            title="No Unlocked Contacts"
            action={
              <Link to="/institute/talent" className="btn btn-primary">
                Discover Talent
              </Link>
            }
          >
            You haven't unlocked any educator profiles yet. Explore the faculty talent pool to unlock verified contacts.
          </EmptyState>
        ) : (
          <div style={autoGrid("320px")}>
            {teachers.map((t) => (
              <div key={t.id} className="card">
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "0.75rem" }}>
                  <TeacherAvatar teacher={t} size={44} />
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>{t.name}</h3>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {[t.qualification, t.primary_subject].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
                <div style={{ background: "var(--color-success-bg)", padding: "0.75rem", borderRadius: "8px", fontSize: "0.88rem", marginBottom: "1rem", wordBreak: "break-all" }}>
                  <div>
                    <Phone size={14} /> {t.phone ? <a href={`tel:${t.phone}`}>{t.phone}</a> : "Phone not provided"}
                  </div>
                  <div>
                    <Mail size={14} /> <a href={`mailto:${t.email}`}>{t.email}</a>
                  </div>
                </div>
                {t.resume_url ? (
                  <a href={t.resume_url} target="_blank" rel="noreferrer noopener" className="btn btn-outline btn-sm" style={{ width: "100%" }}>
                    <FileText size={14} /> Download Resume{t.resume_name ? ` (${t.resume_name})` : ""}
                  </a>
                ) : (
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", textAlign: "center" }}>No resume uploaded yet</div>
                )}
              </div>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
