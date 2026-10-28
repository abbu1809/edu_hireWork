import { applicationBadgeClass, APPLICATION_STATUS_OPTIONS } from "@/shared/constants/options";
import { formatDate } from "@/shared/utils/format";
import { Calendar } from "lucide-react";

const statusLabel = (status) => APPLICATION_STATUS_OPTIONS.find((o) => o.value === status)?.label || (status === "WITHDRAWN" ? "Withdrawn" : status);

/** Teacher's applications (original table). Optional demo column and withdraw action. */
export default function ApplicationsTable({ applications, showDemo = false, onWithdraw, withdrawingId }) {
  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th>Vacancy</th>
            <th>Institute</th>
            <th>Applied On</th>
            <th>Status</th>
            {showDemo && <th>Demo Details</th>}
            {onWithdraw && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr key={app.id}>
              <td>
                <strong>{app.vacancy_title}</strong>
              </td>
              <td>{app.institute_name}</td>
              <td>{formatDate(app.applied_date || app.created_at)}</td>
              <td>
                <span className={`badge ${applicationBadgeClass(app.status)}`}>{statusLabel(app.status || "APPLIED")}</span>
              </td>
              {showDemo && (
                <td>
                  {app.interview_date ? (
                    <span style={{ fontSize: "0.85rem", color: "var(--color-brand-accent)", fontWeight: "600" }}>
                      <Calendar size={14} aria-hidden="true" /> {formatDate(app.interview_date)}
                      {app.interview_time ? ` · ${app.interview_time}` : ""}
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Pending Scheduling</span>
                  )}
                </td>
              )}
              {onWithdraw && (
                <td>
                  {["APPLIED", "UNDER_REVIEW", "SHORTLISTED"].includes(app.status) ? (
                    <button className="btn btn-danger-outline btn-sm" disabled={withdrawingId === app.id} onClick={() => onWithdraw(app)}>
                      {withdrawingId === app.id ? "Withdrawing..." : "Withdraw"}
                    </button>
                  ) : (
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
