import { Building, Star } from "lucide-react";
import { useAdminInstitutes } from "../hooks/useAdmin";
import { useEntityActions } from "../hooks/useEntityActions";
import VerificationBadge from "../components/VerificationBadge";
import { DashboardHeader } from "@/shared/components/layout/DashboardLayout";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { isVerifiedProfile } from "@/shared/utils/format";

export default function AdminInstitutesPage() {
  useDocumentTitle("Institutes");
  const query = useAdminInstitutes();
  const actions = useEntityActions("institutes");
  const institutes = query.data || [];

  return (
    <div>
      <DashboardHeader title="Institutes & Coaching Centers" subtitle="Accreditation status, subscription tiers, and posted job overview" />

      <QueryState query={query} loadingLabel="Loading institutes...">
        {institutes.length === 0 ? (
          <EmptyState icon={Building} title="No Institutes Registered">
            Coaching institutes and schools will appear here upon account creation.
          </EmptyState>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Institute Name</th>
                  <th>City</th>
                  <th>Plan Tier</th>
                  <th>Verification</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {institutes.map((inst) => {
                  const verified = isVerifiedProfile(inst);
                  const archived = inst.status === "Archived";
                  return (
                    <tr key={inst.id} style={archived ? { opacity: 0.6 } : undefined}>
                      <td>
                        <strong>{inst.institute_name}</strong>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{inst.email}</div>
                      </td>
                      <td>{inst.city || "—"}</td>
                      <td>{inst.plan && <span className="badge badge-gold">{inst.plan}</span>}</td>
                      <td>
                        <VerificationBadge status={inst.verification_status} verified={verified} />
                      </td>
                      <td>
                        <span className={`badge ${archived ? "badge-pending" : "badge-verified"}`}>{inst.status || "Active"}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                          {verified ? (
                            <button className="btn btn-outline btn-sm" disabled={actions.pending} onClick={() => actions.setVerification(inst, "Rejected", "Verification revoked by admin")}>
                              Revoke
                            </button>
                          ) : (
                            <button className="btn btn-primary btn-sm" disabled={actions.pending} onClick={() => actions.setVerification(inst, "Verified")}>
                              Verify
                            </button>
                          )}
                          <button
                            className={`btn btn-sm ${inst.featured_on_homepage ? "btn-primary" : "btn-dark-outline"}`}
                            disabled={actions.pending || (!verified && !inst.featured_on_homepage)}
                            onClick={() => actions.toggleFeature(inst)}
                          >
                            {inst.featured_on_homepage ? <><Star size={14} aria-hidden="true" /> Featured</> : "Feature"}
                          </button>
                          <button className="btn btn-dark-outline btn-sm" disabled={actions.pending} onClick={() => actions.toggleArchive(inst, archived)}>
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
