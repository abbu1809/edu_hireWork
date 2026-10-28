import { Link } from "react-router";
import { Users, Building, Briefcase, DollarSign, CheckCircle } from "lucide-react";
import { useAdminStats, useAdminTeachers } from "../hooks/useAdmin";
import { useEntityActions } from "../hooks/useEntityActions";
import { DashboardHeader, KpiCard } from "@/shared/components/layout/DashboardLayout";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { formatCurrency, isVerifiedProfile } from "@/shared/utils/format";

export default function AdminOverviewPage() {
  useDocumentTitle("Admin Command Center");
  const { data: stats } = useAdminStats();
  const teachersQuery = useAdminTeachers();
  const actions = useEntityActions("teachers");

  const pending = (teachersQuery.data || []).filter((t) => !isVerifiedProfile(t) && t.verification_status !== "Rejected" && t.profile_status !== "Archived");

  return (
    <div>
      <DashboardHeader title="Executive Command Center" subtitle="Platform telemetry, user verifications, mediator matchmaking, and gross metrics." />

      <div className="kpi-grid">
        <KpiCard icon={Users} label="Total Educators" value={stats?.totalTeachers ?? "—"} />
        <KpiCard icon={Building} label="Institutes" value={stats?.totalInstitutes ?? "—"} />
        <KpiCard icon={Briefcase} label="Vacancies" value={stats?.totalVacancies ?? "—"} />
        <KpiCard icon={DollarSign} label="Gross Revenue" value={stats ? formatCurrency(stats.totalRevenue) : "—"} />
      </div>

      <div className="card" style={{ marginBottom: "2rem" }}>
        <div className="card-header">
          <h3 className="card-title">Pending KYC Approvals {pending.length > 0 && `(${pending.length})`}</h3>
          <Link to="/admin/teachers" className="btn btn-outline btn-sm">
            View All Educators
          </Link>
        </div>

        <QueryState query={teachersQuery} loadingLabel="Loading educators...">
          {pending.length === 0 ? (
            <EmptyState bare icon={CheckCircle} iconSize={28} title="All KYC Submissions Cleared">
              There are no educator KYC verification requests pending review at this time.
            </EmptyState>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Educator Name</th>
                    <th>Subject</th>
                    <th>Qualification</th>
                    <th>City</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.slice(0, 5).map((t) => (
                    <tr key={t.id}>
                      <td>
                        <strong>{t.name}</strong>
                      </td>
                      <td>{t.primary_subject && <span className="badge badge-role">{t.primary_subject}</span>}</td>
                      <td>{t.qualification || "—"}</td>
                      <td>{t.city || "—"}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button className="btn btn-primary btn-sm" disabled={actions.pending} onClick={() => actions.setVerification(t, "Verified")}>
                            Approve
                          </button>
                          <button className="btn btn-danger-outline btn-sm" disabled={actions.pending} onClick={() => actions.setVerification(t, "Rejected")}>
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
      </div>
    </div>
  );
}
