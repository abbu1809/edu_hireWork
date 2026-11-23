import { useState } from "react";
import { Link } from "react-router";
import { UserCheck, Video, Calendar, Eye, FileText } from "lucide-react";
import { useReceivedApplications, useScheduleInterview, useUpdateApplicationStatus } from "../hooks/useInstitute";
import ApplicantDetailsModal from "../components/ApplicantDetailsModal";
import { DashboardHeader } from "@/shared/components/layout/DashboardLayout";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import Modal from "@/shared/components/Modal";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { notify } from "@/shared/utils/notify";
import { useConfirm } from "@/shared/components/ConfirmDialog";
import { formatDate } from "@/shared/utils/format";
import {
  APPLICATION_STATUS_OPTIONS,
  applicationBadgeClass,
  canTransitionApplicationStatus,
  isTerminalApplicationStatus,
} from "@/shared/constants/options";

const today = () => new Date().toISOString().split("T")[0];

function ScheduleDemoModal({ application, onClose }) {
  const schedule = useScheduleInterview();
  const [form, setForm] = useState({ date: today(), time: "11:00", topic: "", meetingLink: "", notes: "" });
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.topic.trim()) return notify.error("Please enter the trial lecture topic.");
    // Send the local date/time as an ISO instant so the teacher sees the same moment in their timezone.
    const scheduledAt = new Date(`${form.date}T${form.time || "00:00"}`).toISOString();
    schedule.mutate(
      { applicationId: application.id, ...form, scheduledAt },
      {
        onSuccess: () => {
          notify.success("Demo lecture scheduled successfully.");
          onClose();
        },
        onError: (error) => notify.apiError(error, "Scheduling failed."),
      }
    );
  };

  return (
    <Modal title="Schedule Whiteboard Demo Lecture" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="sd-name">
            Candidate Name
          </label>
          <input id="sd-name" type="text" className="input-field" value={`${application.teacher_name} — ${application.vacancy_title}`} disabled />
        </div>

        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <div className="form-group">
            <label className="form-label" htmlFor="sd-date">
              Demo Date
            </label>
            <input id="sd-date" type="date" className="input-field" min={today()} value={form.date} onChange={set("date")} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="sd-time">
              Time
            </label>
            <input id="sd-time" type="time" className="input-field" value={form.time} onChange={set("time")} required />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="sd-topic">
            Trial Lecture Topic
          </label>
          <input
            id="sd-topic"
            type="text"
            className="input-field"
            placeholder="e.g. Rotational Dynamics with Advanced Level Problems"
            value={form.topic}
            onChange={set("topic")}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="sd-link">
            Video Meeting URL
          </label>
          <input id="sd-link" type="url" className="input-field" placeholder="https://meet.google.com/..." value={form.meetingLink} onChange={set("meetingLink")} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="sd-notes">
            Instructions for the Candidate
          </label>
          <textarea id="sd-notes" className="input-field" rows={3} placeholder="Duration, format, what to prepare..." value={form.notes} onChange={set("notes")} />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }} disabled={schedule.isPending}>
          {schedule.isPending ? "Scheduling..." : "Confirm Demo Schedule"}
        </button>
      </form>
    </Modal>
  );
}

export default function InstituteApplicantsPage() {
  useDocumentTitle("ATS Applicants");
  const query = useReceivedApplications();
  const updateStatus = useUpdateApplicationStatus();
  const confirm = useConfirm();
  const [demoFor, setDemoFor] = useState(null);
  const [selectedApplicantId, setSelectedApplicantId] = useState(null);
  const applicants = query.data || [];
  const selectedApplicant = selectedApplicantId ? applicants.find((a) => a.id === selectedApplicantId) || null : null;

  const statusLabelOf = (value) =>
    APPLICATION_STATUS_OPTIONS.find((o) => o.value === value)?.label || (value === "WITHDRAWN" ? "Withdrawn" : value);

  const handleStatusChange = async (app, status) => {
    const currentStatus = app.status || "APPLIED";
    if (status === currentStatus) return;
    if (!canTransitionApplicationStatus(currentStatus, status)) {
      notify.error("Status can only move forward and cannot be changed once finalized.");
      return;
    }

    if (status === "REJECTED") {
      const ok = await confirm({
        title: `Reject ${app.teacher_name}?`,
        message: `They will be notified by email and in-app that their application for "${app.vacancy_title}" was not taken forward. This decision is final and cannot be reversed.`,
        confirmLabel: "Reject applicant",
        tone: "danger",
      });
      if (!ok) return;
    } else if (status === "SELECTED") {
      const ok = await confirm({
        title: `Select ${app.teacher_name}?`,
        message: `Mark ${app.teacher_name} as Selected for "${app.vacancy_title}"? This decision is final and cannot be reversed.`,
        confirmLabel: "Confirm Selection",
      });
      if (!ok) return;
    }

    updateStatus.mutate(
      { id: app.id, status },
      {
        onSuccess: () => notify.success(`Applicant status updated to ${statusLabelOf(status)}.`),
        onError: (error) => notify.apiError(error, "Failed to update status."),
      }
    );
  };

  return (
    <div>
      <DashboardHeader title="Applicant Tracking & ATS Pipeline" subtitle="Review candidate applications and schedule whiteboard trial lectures" />

      <QueryState query={query} loadingLabel="Loading applicants...">
        {applicants.length === 0 ? (
          <EmptyState icon={UserCheck} title="No Applications Received Yet">
            When verified educators apply to your posted vacancies, their profiles will appear in this ATS pipeline.
          </EmptyState>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate Name</th>
                  <th>Applied Vacancy</th>
                  <th>Applied Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((app) => {
                  const currentStatus = app.status || "APPLIED";
                  const terminal = isTerminalApplicationStatus(currentStatus);
                  return (
                    <tr key={app.id}>
                      <td>
                        <div>
                          <strong
                            onClick={() => setSelectedApplicantId(app.id)}
                            style={{ cursor: "pointer", color: "var(--primary-color)" }}
                            title="Click to view candidate details & resume"
                          >
                            {app.teacher_name}
                          </strong>
                          {app.resume_url && (
                            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.2rem" }}>
                              <FileText size={12} /> Resume Attached
                            </div>
                          )}
                        </div>
                      </td>
                      <td>{app.vacancy_title}</td>
                      <td>{formatDate(app.applied_date || app.created_at)}</td>
                      <td>
                        {terminal ? (
                          <span className={`badge ${applicationBadgeClass(currentStatus)}`} title="Final status — cannot be changed">
                            {statusLabelOf(currentStatus)}
                          </span>
                        ) : (
                          <select
                            className="input-select input-compact"
                            aria-label={`Status for ${app.teacher_name}`}
                            value={currentStatus}
                            disabled={updateStatus.isPending && updateStatus.variables?.id === app.id}
                            onChange={(e) => handleStatusChange(app, e.target.value)}
                          >
                            {APPLICATION_STATUS_OPTIONS.map((o) => {
                              const allowed = o.value === currentStatus || canTransitionApplicationStatus(currentStatus, o.value);
                              return (
                                <option key={o.value} value={o.value} disabled={!allowed}>
                                  {o.label}
                                </option>
                              );
                            })}
                          </select>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                          <button
                            className="btn btn-outline btn-sm"
                            title="View full candidate details, qualifications & resume"
                            onClick={() => setSelectedApplicantId(app.id)}
                            style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                          >
                            <Eye size={13} /> View Resume
                          </button>
                          {app.interview_date ? (
                            <span style={{ fontSize: "0.85rem", color: "var(--color-brand-accent)", fontWeight: 600, whiteSpace: "nowrap" }}>
                              <Calendar size={14} aria-hidden="true" /> {formatDate(app.interview_date)}
                              {app.interview_time ? ` · ${app.interview_time}` : ""}
                            </span>
                          ) : (
                            <button className="btn btn-outline btn-sm" disabled={terminal} onClick={() => setDemoFor(app)}>
                              <Video size={13} /> Schedule Demo
                            </button>
                          )}
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

      {selectedApplicant && (
        <ApplicantDetailsModal
          application={selectedApplicant}
          onClose={() => setSelectedApplicantId(null)}
          onUpdateStatus={handleStatusChange}
          onScheduleDemo={(app) => setDemoFor(app)}
          isUpdating={updateStatus.isPending}
        />
      )}

      {demoFor && <ScheduleDemoModal application={demoFor} onClose={() => setDemoFor(null)} />}
    </div>
  );
}
