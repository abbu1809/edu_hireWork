import { Link } from "react-router";
import { Briefcase, Send, Video, ShieldCheck } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useMyApplications, useMyInterviews } from "../hooks/useTeacher";
import { usePublicStats } from "@/features/site/hooks/useSite";
import ApplicationsTable from "../components/ApplicationsTable";
import { DashboardHeader, KpiCard } from "@/shared/components/layout/DashboardLayout";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";

export default function TeacherOverviewPage() {
  useDocumentTitle("Educator Dashboard");
  const { currentUser } = useAuth();
  const applicationsQuery = useMyApplications();
  const { data: interviews = [] } = useMyInterviews();
  const { data: stats } = usePublicStats();

  const applications = applicationsQuery.data || [];
  const activeApplications = applications.filter((a) => !["WITHDRAWN", "REJECTED"].includes(a.status));
  const completionScore = currentUser?.profile_completion_percent ?? 0;

  return (
    <div>
      <DashboardHeader
        title="Educator Dashboard"
        subtitle={`Welcome back, ${currentUser?.name}. Track job matches, whiteboard trial schedules, and profile visibility.`}
        actions={
          <Link to="/teacher/jobs" className="btn btn-primary">
            <Briefcase size={16} /> Browse Vacancies
          </Link>
        }
      />

      <div className="kpi-grid">
        <KpiCard icon={Send} label="Active Applications" value={activeApplications.length} />
        <KpiCard icon={Video} label="Demo Rounds" value={interviews.length} />
        <KpiCard icon={Briefcase} label="Open Vacancies" value={stats?.vacancies ?? "—"} />
        <KpiCard icon={ShieldCheck} label="Profile Strength" value={`${completionScore}%`} />
      </div>

      {completionScore < 100 && (
        <div className="card-gold-wash" style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", gap: "1rem", flexWrap: "wrap" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700" }}>Complete Your Educator Profile ({completionScore}%)</h3>
            <Link to="/teacher/profile" className="btn btn-black btn-sm">
              Update Details
            </Link>
          </div>
          <div
            className="progress"
            role="progressbar"
            aria-valuenow={completionScore}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${completionScore}%` }} />
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
            Profiles with verified degrees, experience certificates, and introductory demo links receive 4x more interview invitations.
          </p>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Job Applications</h3>
          <Link to="/teacher/applications" className="btn btn-outline btn-sm">
            View All
          </Link>
        </div>

        <QueryState query={applicationsQuery} loadingLabel="Loading applications...">
          {applications.length === 0 ? (
            <EmptyState
              bare
              icon={Send}
              iconSize={24}
              title="No Applications Submitted Yet"
              action={
                <Link to="/teacher/jobs" className="btn btn-primary btn-sm">
                  Find Vacancies
                </Link>
              }
            >
              Browse active openings across coaching institutes and schools to submit your application.
            </EmptyState>
          ) : (
            <ApplicationsTable applications={applications.slice(0, 5)} />
          )}
        </QueryState>
      </div>
    </div>
  );
}
