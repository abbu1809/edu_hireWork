import { Video, ExternalLink, Star } from "lucide-react";
import { useMyInterviews } from "../hooks/useTeacher";
import { DashboardHeader } from "@/shared/components/layout/DashboardLayout";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { autoGrid, formatDateTime } from "@/shared/utils/format";

export default function TeacherInterviewsPage() {
  useDocumentTitle("Demo Lectures");
  const query = useMyInterviews();
  const interviews = query.data || [];

  return (
    <div>
      <DashboardHeader title="Scheduled Demo Lectures" subtitle="Whiteboard trial rounds and technical interviews assigned by partner institutes" />

      <QueryState query={query} loadingLabel="Loading demo lectures...">
        {interviews.length === 0 ? (
          <EmptyState icon={Video} title="No Demos Scheduled Yet">
            When an institute shortlists your application for a teaching demo, meeting links and topics will appear here.
          </EmptyState>
        ) : (
          <div style={autoGrid("360px")}>
            {interviews.map((iv) => (
              <div key={iv.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span className="badge badge-gold"><Star size={13} aria-hidden="true" /> {iv.status === "COMPLETED" ? "Completed Demo" : "Scheduled Demo"}</span>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{formatDateTime(iv.scheduled_at)}</span>
                </div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: "700", marginBottom: "0.5rem" }}>{iv.topic}</h3>
                {iv.notes && <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>{iv.notes}</p>}
                {iv.meeting_link && (
                  <a href={iv.meeting_link} target="_blank" rel="noreferrer noopener" className="btn btn-primary btn-sm" style={{ width: "100%" }}>
                    <ExternalLink size={16} /> Join Online Trial Room
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
