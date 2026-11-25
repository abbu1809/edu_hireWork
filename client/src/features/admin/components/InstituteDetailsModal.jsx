import { ExternalLink, Building, Briefcase, FileText, CheckCircle, XCircle, Trash2, Star, Archive, MapPin, Mail, Phone, Globe, Users } from "lucide-react";
import Modal from "@/shared/components/Modal";
import VerificationBadge from "./VerificationBadge";
import { useInstituteDetails, useVerifyDocument } from "../hooks/useAdmin";
import { useEntityActions } from "../hooks/useEntityActions";
import { isVerifiedProfile } from "@/shared/utils/format";
import { notify } from "@/shared/utils/notify";

const DOC_STATUS_BADGE = {
  Approved: "badge-verified",
  Rejected: "badge-rejected",
  Pending: "badge-pending",
};

export default function InstituteDetailsModal({ instituteId, onClose }) {
  const { data: institute, isLoading, error } = useInstituteDetails(instituteId);
  const actions = useEntityActions("institutes");
  const verifyDoc = useVerifyDocument();

  const handleDocDecision = (docId, status) => {
    verifyDoc.mutate(
      { id: docId, status },
      {
        onSuccess: () => notify.success(`Document marked as ${status}.`),
        onError: (err) => notify.apiError(err, "Could not update document status."),
      }
    );
  };

  if (!instituteId) return null;

  return (
    <Modal title="Institute Profile & Accreditation Audit" onClose={onClose} maxWidth="850px">
      {isLoading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
          Loading institute details, vacancies and documents...
        </div>
      ) : error || !institute ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--danger-color, #e53e3e)" }}>
          {error?.message || "Failed to load institute details."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxHeight: "80vh", overflowY: "auto", paddingRight: "0.25rem" }}>
          {/* Header Card */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <h2 style={{ fontSize: "1.3rem", fontWeight: "700", margin: "0" }}>
                  {institute.institute_name || institute.name}
                </h2>
                {institute.plan && <span className="badge badge-gold">{institute.plan}</span>}
              </div>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.4rem" }}>
                {institute.email && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Mail size={14} /> {institute.email}
                  </span>
                )}
                {institute.phone && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Phone size={14} /> {institute.phone}
                  </span>
                )}
                {institute.city && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <MapPin size={14} /> {institute.city}{institute.state ? `, ${institute.state}` : ""}
                  </span>
                )}
                {institute.website && (
                  <a
                    href={institute.website.startsWith("http") ? institute.website : `https://${institute.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "flex", alignItems: "center", gap: "0.3rem", color: "var(--primary-color)" }}
                  >
                    <Globe size={14} /> Website <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <VerificationBadge status={institute.verification_status} verified={isVerifiedProfile(institute)} />
              {institute.featured_on_homepage && (
                <span className="badge badge-gold" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <Star size={12} /> Featured
                </span>
              )}
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
            <div style={{ background: "var(--surface-sunken, #f8fafc)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Institute Type</div>
              <div style={{ fontWeight: "600", marginTop: "0.2rem" }}>{institute.institute_type || "Coaching / School"}</div>
            </div>
            <div style={{ background: "var(--surface-sunken, #f8fafc)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Student Count</div>
              <div style={{ fontWeight: "600", marginTop: "0.2rem" }}>{institute.student_count || "—"}</div>
            </div>
            <div style={{ background: "var(--surface-sunken, #f8fafc)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Established</div>
              <div style={{ fontWeight: "600", marginTop: "0.2rem" }}>{institute.established_year || "—"}</div>
            </div>
            <div style={{ background: "var(--surface-sunken, #f8fafc)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Active Vacancies</div>
              <div style={{ fontWeight: "600", marginTop: "0.2rem" }}>{institute.vacancies?.length || 0}</div>
            </div>
          </div>

          {/* Address & About */}
          {institute.address && (
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <strong>Campus Address:</strong> {institute.address}, {institute.city} {institute.pincode ? `- ${institute.pincode}` : ""}
            </div>
          )}

          {institute.about && (
            <div>
              <h4 style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>About Institute</h4>
              <p style={{ fontSize: "0.9rem", lineHeight: "1.5", margin: 0, whiteSpace: "pre-wrap" }}>{institute.about}</p>
            </div>
          )}

          {/* Uploaded Documents / Registration Proof */}
          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem", margin: "0 0 0.75rem" }}>
              <FileText size={18} color="var(--primary-color)" /> Accreditation & Verification Documents ({institute.documents?.length || 0})
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {institute.documents && institute.documents.length > 0 ? (
                institute.documents.map((doc) => (
                  <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", padding: "0.75rem 1rem", background: "var(--surface-sunken, #f8fafc)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <FileText size={20} color="var(--primary-color)" />
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "0.9rem" }}>{doc.name || doc.file_name || doc.document_type}</div>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.15rem", flexWrap: "wrap" }}>
                          <span className="badge badge-role" style={{ fontSize: "0.7rem" }}>{doc.document_type}</span>
                          <span className={`badge ${DOC_STATUS_BADGE[doc.status] || "badge-pending"}`} style={{ fontSize: "0.7rem" }}>
                            {doc.status || "Pending"}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ""}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                      {doc.status !== "Approved" && (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={verifyDoc.isPending}
                          onClick={() => handleDocDecision(doc.id, "Approved")}
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                        >
                          <CheckCircle size={13} /> Approve
                        </button>
                      )}
                      {doc.status !== "Rejected" && (
                        <button
                          type="button"
                          className="btn btn-danger-outline btn-sm"
                          disabled={verifyDoc.isPending}
                          onClick={() => handleDocDecision(doc.id, "Rejected")}
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      )}
                      {doc.signed_url ? (
                        <a
                          href={doc.signed_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline btn-sm"
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                        >
                          <ExternalLink size={14} /> View
                        </a>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>URL unavailable</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "1.25rem", textAlign: "center", background: "var(--surface-sunken, #f8fafc)", borderRadius: "8px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  No accreditation documents uploaded yet.
                </div>
              )}
            </div>
          </div>

          {/* Posted Vacancies Section */}
          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem", margin: "0 0 0.75rem" }}>
              <Briefcase size={18} color="var(--primary-color)" /> Posted Vacancies ({institute.vacancies?.length || 0})
            </h3>

            {institute.vacancies && institute.vacancies.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {institute.vacancies.map((v) => (
                  <div key={v.id} style={{ padding: "0.75rem 1rem", background: "var(--surface-sunken, #f8fafc)", borderRadius: "8px", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "0.9rem" }}>{v.title}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                        {v.subject && <span>{v.subject} • </span>}
                        {v.job_type && <span>{v.job_type} • </span>}
                        {v.min_salary || v.max_salary ? (
                          <span>₹{Number(v.min_salary || 0).toLocaleString("en-IN")} - ₹{Number(v.max_salary || 0).toLocaleString("en-IN")} • </span>
                        ) : null}
                        <span>Posted {v.created_at ? new Date(v.created_at).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                    <span className={`badge ${v.status === "ACTIVE" ? "badge-verified" : "badge-pending"}`}>
                      {v.status || "ACTIVE"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "1.25rem", textAlign: "center", background: "var(--surface-sunken, #f8fafc)", borderRadius: "8px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                No vacancies posted by this institute.
              </div>
            )}
          </div>

          {/* Admin Controls Footer */}
          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <button
              className="btn btn-danger-outline btn-sm"
              disabled={actions.pending}
              onClick={() => actions.deleteEntity(institute, onClose)}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
            >
              <Trash2 size={14} /> Delete Profile
            </button>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                className={`btn btn-sm ${institute.featured_on_homepage ? "btn-primary" : "btn-dark-outline"}`}
                disabled={actions.pending || (!isVerifiedProfile(institute) && !institute.featured_on_homepage)}
                onClick={() => actions.toggleFeature(institute)}
              >
                <Star size={14} /> {institute.featured_on_homepage ? "Featured" : "Feature"}
              </button>

              <button
                className="btn btn-dark-outline btn-sm"
                disabled={actions.pending}
                onClick={() => actions.toggleArchive(institute, institute.status === "Archived")}
              >
                <Archive size={14} /> {institute.status === "Archived" ? "Restore" : "Archive"}
              </button>

              {!isVerifiedProfile(institute) ? (
                <button
                  className="btn btn-primary btn-sm"
                  disabled={actions.pending}
                  onClick={() => actions.setVerification(institute, "Verified")}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                >
                  <CheckCircle size={14} /> Verify Institute
                </button>
              ) : (
                <button
                  className="btn btn-outline btn-sm"
                  disabled={actions.pending}
                  onClick={() => actions.setVerification(institute, "Rejected", "Verification revoked by admin")}
                >
                  Revoke Verification
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
