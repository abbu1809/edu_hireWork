import { Link } from "react-router";
import { Edit, Trash2, Flame } from "lucide-react";

const statusBadge = (status) => (status === "Active" ? "badge-verified" : status === "Draft" ? "badge-pending" : "badge-role");

/** Institute's vacancies (original table) with optional edit/delete actions. */
export default function VacanciesTable({ vacancies, onEdit, onDelete, showUrgency = false, deletingId }) {
  return (
    <div className="table-responsive">
      <table className="data-table">
        <thead>
          <tr>
            <th>Vacancy Title</th>
            <th>Subject</th>
            <th>Salary Range</th>
            <th>City</th>
            {showUrgency && <th>Urgency</th>}
            <th>Status</th>
            {(onEdit || onDelete) && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {vacancies.map((v) => (
            <tr key={v.id}>
              <td>
                <strong>
                  <Link to={`/careers/${v.id}`} style={{ color: "inherit" }}>
                    {v.title}
                  </Link>
                </strong>
              </td>
              <td>
                <span className="badge badge-role">{v.subject}</span>
              </td>
              <td>{v.salary_range}</td>
              <td>{v.city}</td>
              {showUrgency && (
                <td>
                  {v.urgency === "Urgent" ? (
                    <span className="badge badge-rejected"><Flame size={13} aria-hidden="true" /> Urgent</span>
                  ) : v.urgency === "High" ? (
                    <span className="badge badge-gold">High</span>
                  ) : (
                    <span className="badge badge-role">Normal</span>
                  )}
                </td>
              )}
              <td>
                <span className={`badge ${statusBadge(v.status)}`}>{v.status}</span>
              </td>
              {(onEdit || onDelete) && (
                <td>
                  <div style={{ display: "flex", gap: "0.4rem" }}>
                    {onEdit && (
                      <button className="btn btn-outline btn-sm" onClick={() => onEdit(v)} aria-label={`Edit ${v.title}`}>
                        <Edit size={14} /> Edit
                      </button>
                    )}
                    {onDelete && (
                      <button className="btn btn-danger-outline btn-sm" onClick={() => onDelete(v)} disabled={deletingId === v.id} aria-label={`Delete ${v.title}`}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
