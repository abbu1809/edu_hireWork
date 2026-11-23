import { ExternalLink, FileText, CheckCircle, XCircle, Trash2, Star, Archive, ShieldCheck, Video, MapPin, Mail, Phone, Briefcase, GraduationCap } from "lucide-react";
import Modal from "@/shared/components/Modal";
import VerificationBadge from "./VerificationBadge";
import { useTeacherDetails } from "../hooks/useAdmin";
import { useEntityActions } from "../hooks/useEntityActions";
import { formatCurrency, isVerifiedProfile } from "@/shared/utils/format";

export default function TeacherDetailsModal({ teacherId, onClose }) {
  const { data: teacher, isLoading, error } = useTeacherDetails(teacherId);
  const actions = useEntityActions("teachers");

  if (!teacherId) return null;

  return (
    <Modal title="Educator Profile & KYC Audit" onClose={onClose} maxWidth="800px">
      {isLoading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
          Loading educator details and documents...
        </div>
      ) : error || !teacher ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--danger-color, #e53e3e)" }}>
          {error?.message || "Failed to load educator details."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxHeight: "80vh", overflowY: "auto", paddingRight: "0.25rem" }}>
          {/* Header Card */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem" }}>
            <div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "700", margin: "0 0 0.25rem" }}>{teacher.name}</h2>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {teacher.email && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Mail size={14} /> {teacher.email}
                  </span>
                )}
                {teacher.phone && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Phone size={14} /> {teacher.phone}
                  </span>
                )}
                {teacher.city && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <MapPin size={14} /> {teacher.city}{teacher.state ? `, ${teacher.state}` : ""}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <VerificationBadge status={teacher.verification_status} verified={isVerifiedProfile(teacher)} />
              {teacher.featured_on_homepage && (
                <span className="badge badge-gold" style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <Star size={12} /> Featured
                </span>
              )}
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
            <div style={{ background: "var(--surface-sunken, #f8fafc)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Primary Subject</div>
              <div style={{ fontWeight: "600", marginTop: "0.2rem" }}>{teacher.primary_subject || "Not specified"}</div>
            </div>
            <div style={{ background: "var(--surface-sunken, #f8fafc)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Experience</div>
              <div style={{ fontWeight: "600", marginTop: "0.2rem" }}>{teacher.experience_years != null ? `${teacher.experience_years} Years` : "—"}</div>
            </div>
            <div style={{ background: "var(--surface-sunken, #f8fafc)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Current Salary</div>
              <div style={{ fontWeight: "600", marginTop: "0.2rem" }}>{teacher.current_salary ? formatCurrency(teacher.current_salary) : "—"}</div>
            </div>
            <div style={{ background: "var(--surface-sunken, #f8fafc)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Expected Salary</div>
              <div style={{ fontWeight: "600", marginTop: "0.2rem" }}>{teacher.expected_salary ? formatCurrency(teacher.expected_salary) : "—"}</div>
            </div>
          </div>

          {/* Secondary Subjects & Bio */}
          {teacher.secondary_subjects?.length > 0 && (
            <div>
              <h4 style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>Secondary Subjects</h4>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                {teacher.secondary_subjects.map((s, idx) => (
                  <span key={idx} className="badge badge-role">{s}</span>
                ))}
              </div>
            </div>
          )}

          {teacher.bio && (
            <div>
              <h4 style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>Professional Summary</h4>
              <p style={{ fontSize: "0.9rem", lineHeight: "1.5", margin: 0, whiteSpace: "pre-wrap" }}>{teacher.bio}</p>
            </div>
          )}

          {/* Qualifications & Demo Link */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {teacher.qualifications && (
              <div style={{ background: "var(--surface-sunken, #f8fafc)", padding: "0.75rem", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: "600", fontSize: "0.85rem", marginBottom: "0.3rem" }}>
                  <GraduationCap size={16} /> Qualifications
                </div>
                <div style={{ fontSize: "0.85rem" }}>
                  {Array.isArray(teacher.qualifications)
                    ? teacher.qualifications.join(", ")
                    : String(teacher.qualifications)}
                </div>
              </div>
            )}

            {teacher.demo_video_url && (
              <div style={{ background: "var(--surface-sunken, #f8fafc)", padding: "0.75rem", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: "600", fontSize: "0.85rem", marginBottom: "0.3rem" }}>
                  <Video size={16} /> Demo Lecture Link
                </div>
                <a
                  href={teacher.demo_video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline btn-sm"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", marginTop: "0.25rem" }}
                >
                  <ExternalLink size={14} /> Watch Demo Lecture
                </a>
              </div>
            )}
          </div>

          {/* Uploaded Documents Section */}
          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem", margin: 0 }}>
                <FileText size={18} color="var(--primary-color)" /> Uploaded Documents & Credentials ({((teacher.documents?.length || 0) + (teacher.resume_signed_url ? 1 : 0))})
              </h3>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Verify credentials prior to approving KYC</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {/* Profile Resume */}
              {teacher.resume_signed_url && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", background: "var(--surface-sunken, #f8fafc)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <FileText size={20} color="var(--primary-color)" />
                    <div>
                      <div style={{ fontWeight: "600", fontSize: "0.9rem" }}>Curriculum Vitae / Resume</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Main Teacher Resume</div>
                    </div>
                  </div>
                  <a
                    href={teacher.resume_signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                  >
                    <ExternalLink size={14} /> View Document
                  </a>
                </div>
              )}

              {/* Other Documents */}
              {teacher.documents && teacher.documents.length > 0 ? (
                teacher.documents.map((doc) => (
                  <div key={doc.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1rem", background: "var(--surface-sunken, #f8fafc)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <FileText size={20} color="var(--primary-color)" />
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "0.9rem" }}>{doc.file_name || doc.document_type}</div>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.15rem" }}>
                          <span className="badge badge-role" style={{ fontSize: "0.7rem" }}>{doc.document_type}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ""}</span>
                        </div>
                      </div>
                    </div>
                    {doc.signed_url ? (
                      <a
                        href={doc.signed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline btn-sm"
                        style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                      >
                        <ExternalLink size={14} /> View Document
                      </a>
                    ) : (
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>URL unavailable</span>
                    )}
                  </div>
                ))
              ) : !teacher.resume_signed_url ? (
                <div style={{ padding: "1.25rem", textAlign: "center", background: "var(--surface-sunken, #f8fafc)", borderRadius: "8px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                  No documents have been uploaded by this teacher yet.
                </div>
              ) : null}
            </div>
          </div>

          {/* Verification Reason / History if present */}
          {teacher.verification_reason && (
            <div style={{ padding: "0.75rem", borderRadius: "8px", background: "#fef2f2", border: "1px solid #fecaca", fontSize: "0.85rem", color: "#991b1b" }}>
              <strong>Last Decision Reason:</strong> {teacher.verification_reason}
            </div>
          )}

          {/* Admin Controls Footer */}
          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <button
              className="btn btn-danger-outline btn-sm"
              disabled={actions.pending}
              onClick={() => actions.deleteEntity(teacher, onClose)}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
            >
              <Trash2 size={14} /> Delete Profile
            </button>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                className={`btn btn-sm ${teacher.featured_on_homepage ? "btn-primary" : "btn-dark-outline"}`}
                disabled={actions.pending || (!isVerifiedProfile(teacher) && !teacher.featured_on_homepage)}
                onClick={() => actions.toggleFeature(teacher)}
              >
                <Star size={14} /> {teacher.featured_on_homepage ? "Featured" : "Feature"}
              </button>

              <button
                className="btn btn-dark-outline btn-sm"
                disabled={actions.pending}
                onClick={() => actions.toggleArchive(teacher, teacher.profile_status === "Archived")}
              >
                <Archive size={14} /> {teacher.profile_status === "Archived" ? "Restore" : "Archive"}
              </button>

              {!isVerifiedProfile(teacher) ? (
                <>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={actions.pending}
                    onClick={() => actions.setVerification(teacher, "Verified")}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                  >
                    <CheckCircle size={14} /> Approve KYC
                  </button>
                  {teacher.verification_status !== "Rejected" && (
                    <button
                      className="btn btn-danger-outline btn-sm"
                      disabled={actions.pending}
                      onClick={() => actions.setVerification(teacher, "Rejected")}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                    >
                      <XCircle size={14} /> Reject KYC
                    </button>
                  )}
                </>
              ) : (
                <button
                  className="btn btn-outline btn-sm"
                  disabled={actions.pending}
                  onClick={() => actions.setVerification(teacher, "Rejected", "Verification revoked by admin")}
                >
                  Revoke KYC
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
