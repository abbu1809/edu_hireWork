import { ExternalLink, FileText, Video, Mail, Phone, MapPin, Briefcase, GraduationCap, CheckCircle2, XCircle, Calendar, Star, Lock } from "lucide-react";
import Modal from "@/shared/components/Modal";
import { formatDate } from "@/shared/utils/format";
import {
  APPLICATION_STATUS_OPTIONS,
  canTransitionApplicationStatus,
  isTerminalApplicationStatus,
} from "@/shared/constants/options";

export default function ApplicantDetailsModal({
  application,
  onClose,
  onUpdateStatus,
  onScheduleDemo,
  isUpdating = false,
}) {
  if (!application) return null;

  const teacher = application.teacher || {};
  const currentStatus = application.status || "APPLIED";
  const statusOption = APPLICATION_STATUS_OPTIONS.find((o) => o.value === currentStatus);
  const isTerminal = isTerminalApplicationStatus(currentStatus);
  const isRejected = currentStatus === "REJECTED";
  const canShortlist = canTransitionApplicationStatus(currentStatus, "SHORTLISTED");
  const canSelect = canTransitionApplicationStatus(currentStatus, "SELECTED");
  const canReject = canTransitionApplicationStatus(currentStatus, "REJECTED");

  return (
    <Modal title="Candidate Application & Resume Review" onClose={onClose} maxWidth="750px">
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxHeight: "80vh", overflowY: "auto", paddingRight: "0.25rem" }}>
        {/* Header Section */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "700", margin: 0 }}>
                {application.teacher_name || teacher.name}
              </h2>
              {teacher.verified && (
                <span className="badge badge-verified" style={{ fontSize: "0.75rem" }}>
                  Verified Faculty
                </span>
              )}
            </div>
            {teacher.headline && (
              <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: "0.25rem", fontWeight: "500" }}>
                {teacher.headline}
              </div>
            )}
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
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
              {(teacher.city || application.city) && (
                <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <MapPin size={14} /> {teacher.city || application.city}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
            <span className={`badge ${isRejected ? "badge-rejected" : application.status === "SELECTED" ? "badge-verified" : "badge-role"}`} style={{ fontSize: "0.85rem", padding: "0.35rem 0.75rem" }}>
              {statusOption?.label || application.status || "Applied"}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
              Applied {formatDate(application.applied_date || application.created_at)}
            </span>
          </div>
        </div>

        {/* Applied Position Info */}
        <div style={{ background: "var(--surface-sunken, #f8fafc)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Applied Position</div>
            <div style={{ fontWeight: "700", fontSize: "0.95rem" }}>{application.vacancy_title}</div>
          </div>
          {application.interview_date && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--color-brand-accent)", fontWeight: "600", fontSize: "0.85rem" }}>
              <Calendar size={15} /> Demo Scheduled: {formatDate(application.interview_date)} {application.interview_time || ""}
            </div>
          )}
        </div>

        {/* Key Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <div style={{ background: "var(--surface-sunken, #f8fafc)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Primary Subject</div>
            <div style={{ fontWeight: "600", marginTop: "0.2rem" }}>{teacher.primary_subject || (teacher.subjects?.[0]) || "—"}</div>
          </div>
          <div style={{ background: "var(--surface-sunken, #f8fafc)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Teaching Experience</div>
            <div style={{ fontWeight: "600", marginTop: "0.2rem" }}>
              {teacher.experience_years != null ? `${teacher.experience_years} Years` : "—"}
            </div>
          </div>
          <div style={{ background: "var(--surface-sunken, #f8fafc)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Highest Qualification</div>
            <div style={{ fontWeight: "600", marginTop: "0.2rem" }}>
              {Array.isArray(teacher.qualification) ? teacher.qualification.join(", ") : teacher.qualification || "—"}
            </div>
          </div>
        </div>

        {/* Bio / Summary */}
        {teacher.bio && (
          <div>
            <h4 style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>Candidate Bio / Statement</h4>
            <p style={{ fontSize: "0.9rem", lineHeight: "1.5", margin: 0, whiteSpace: "pre-wrap" }}>{teacher.bio}</p>
          </div>
        )}

        {/* Demo Video Link if available */}
        {teacher.demo_lecture_url && (
          <div style={{ background: "var(--surface-sunken, #f8fafc)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Video size={18} color="var(--primary-color)" />
              <div>
                <div style={{ fontWeight: "600", fontSize: "0.9rem" }}>Recorded Demo Lecture</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Watch candidate teaching trial</div>
              </div>
            </div>
            <a
              href={teacher.demo_lecture_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-sm"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
            >
              <ExternalLink size={14} /> Watch Demo
            </a>
          </div>
        )}

        {/* Resume Review Section */}
        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
          <h4 style={{ fontSize: "0.95rem", fontWeight: "700", display: "flex", alignItems: "center", gap: "0.4rem", margin: "0 0 0.75rem" }}>
            <FileText size={18} color="var(--primary-color)" /> Candidate Resume / CV
          </h4>

          {application.resume_url ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem 1.25rem", background: "var(--surface-sunken, #f8fafc)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <FileText size={28} color="var(--primary-color)" />
                <div>
                  <div style={{ fontWeight: "600", fontSize: "0.95rem" }}>
                    {application.teacher_name || "Candidate"}_Resume.pdf
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Verified PDF document submitted with application
                  </div>
                </div>
              </div>
              <a
                href={application.resume_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", padding: "0.5rem 1rem" }}
              >
                <ExternalLink size={14} /> View / Download Resume
              </a>
            </div>
          ) : (
            <div style={{ padding: "1.25rem", textAlign: "center", background: "var(--surface-sunken, #f8fafc)", borderRadius: "8px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              No uploaded resume document attached. Candidate applied using on-platform profile.
            </div>
          )}
        </div>

        {/* ATS Action Controls Footer */}
        {isTerminal ? (
          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            <Lock size={15} />
            <span>
              Status is finalized as <strong>{statusOption?.label || currentStatus}</strong> and can no longer be modified.
            </span>
          </div>
        ) : (
          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              {canReject && (
                <button
                  className="btn btn-danger-outline btn-sm"
                  disabled={isUpdating}
                  onClick={() => onUpdateStatus(application, "REJECTED")}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                >
                  <XCircle size={14} /> Reject Candidate
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {canShortlist && (
                <button
                  className="btn btn-outline btn-sm"
                  disabled={isUpdating}
                  onClick={() => onUpdateStatus(application, "SHORTLISTED")}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                >
                  <Star size={14} /> Shortlist
                </button>
              )}

              {!application.interview_date && (
                <button
                  className="btn btn-outline btn-sm"
                  disabled={isUpdating}
                  onClick={() => {
                    onScheduleDemo(application);
                    onClose();
                  }}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                >
                  <Video size={14} /> Schedule Demo
                </button>
              )}

              {canSelect && (
                <button
                  className="btn btn-primary btn-sm"
                  disabled={isUpdating}
                  onClick={() => onUpdateStatus(application, "SELECTED")}
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                >
                  <CheckCircle2 size={14} /> Select / Hire
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

