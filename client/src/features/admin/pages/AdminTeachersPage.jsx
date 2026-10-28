import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Users, Flag, Star } from "lucide-react";
import { useAdminTeachers } from "../hooks/useAdmin";
import { useEntityActions } from "../hooks/useEntityActions";
import VerificationBadge from "../components/VerificationBadge";
import { DashboardHeader } from "@/shared/components/layout/DashboardLayout";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { isVerifiedProfile } from "@/shared/utils/format";

const FILTERS = [
  ["all", "All"],
  ["pending", "Pending KYC"],
  ["verified", "Verified"],
  ["archived", "Archived"],
];

export default function AdminTeachersPage() {
  useDocumentTitle("Teachers & KYC");
  const query = useAdminTeachers();
  const actions = useEntityActions("teachers");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const teachers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (query.data || []).filter((t) => {
      const archived = t.profile_status === "Archived";
      if (filter === "pending" && (isVerifiedProfile(t) || archived)) return false;
      if (filter === "verified" && !isVerifiedProfile(t)) return false;
      if (filter === "archived" && !archived) return false;
      if (filter !== "archived" && filter !== "all" && archived) return false;
      return !q || [t.name, t.email, t.primary_subject, t.city].some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [query.data, search, filter]);

  return (
    <div>
      <DashboardHeader title="Educator Directory & KYC Verification" subtitle="Audit credentials, grant badges, and manage homepage feature status" />

      <div className="filter-bar">
        <div style={{ flex: 2, minWidth: "220px" }}>
          <input type="search" className="input-field" placeholder="Search name, email, subject or city..." aria-label="Search educators" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {FILTERS.map(([id, label]) => (
            <button key={id} className={`btn btn-sm ${filter === id ? "btn-primary" : "btn-dark-outline"}`} onClick={() => setFilter(id)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <QueryState query={query} loadingLabel="Loading educators...">
        {teachers.length === 0 ? (
          <EmptyState icon={Users} title={query.data?.length ? "No Educators Match This Filter" : "No Educators Registered Yet"}>
            As teachers register on the platform, their profiles will appear here for verification.
          </EmptyState>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Educator</th>
                  <th>Subject</th>
                  <th>Experience</th>
                  <th>KYC Status</th>
                  <th>Homepage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => {
                  const verified = isVerifiedProfile(t);
                  const archived = t.profile_status === "Archived";
                  return (
                    <tr key={t.id} style={archived ? { opacity: 0.6 } : undefined}>
                      <td>
                        <div>
                          <strong>
                            <Link to={`/faculty/${t.id}`} style={{ color: "inherit" }}>
                              {t.name}
                            </Link>
                          </strong>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{t.email}</div>
                          {t.flagged && <span className="badge badge-rejected" style={{ marginTop: "0.25rem" }}><Flag size={12} aria-hidden="true" /> Flagged</span>}
                        </div>
                      </td>
                      <td>{t.primary_subject && <span className="badge badge-role">{t.primary_subject}</span>}</td>
                      <td>{t.experience_years != null ? `${t.experience_years} Years` : "—"}</td>
                      <td>
                        <VerificationBadge status={t.verification_status} verified={verified} />
                      </td>
                      <td>
                        <button
                          className={`btn btn-sm ${t.featured_on_homepage ? "btn-primary" : "btn-dark-outline"}`}
                          disabled={actions.pending || (!verified && !t.featured_on_homepage)}
                          title={!verified ? "Only verified profiles can be featured" : undefined}
                          onClick={() => actions.toggleFeature(t)}
                        >
                          {t.featured_on_homepage ? <><Star size={14} aria-hidden="true" /> Featured</> : "Feature"}
                        </button>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                          {!verified ? (
                            <>
                              <button className="btn btn-primary btn-sm" disabled={actions.pending} onClick={() => actions.setVerification(t, "Verified")}>
                                Approve
                              </button>
                              {t.verification_status !== "Rejected" && (
                                <button className="btn btn-danger-outline btn-sm" disabled={actions.pending} onClick={() => actions.setVerification(t, "Rejected")}>
                                  Reject
                                </button>
                              )}
                            </>
                          ) : (
                            <button className="btn btn-outline btn-sm" disabled={actions.pending} onClick={() => actions.setVerification(t, "Rejected", "Verification revoked by admin")}>
                              Revoke
                            </button>
                          )}
                          <button className="btn btn-dark-outline btn-sm" disabled={actions.pending} onClick={() => actions.toggleArchive(t, archived)}>
                            {archived ? "Restore" : "Archive"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
    </div>
  );
}
