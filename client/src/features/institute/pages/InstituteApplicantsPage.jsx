import { useState } from "react";
import { Link } from "react-router";
import { UserCheck, Video, Calendar } from "lucide-react";
import { useReceivedApplications, useScheduleInterview, useUpdateApplicationStatus } from "../hooks/useInstitute";
import { DashboardHeader } from "@/shared/components/layout/DashboardLayout";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import Modal from "@/shared/components/Modal";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { notify } from "@/shared/utils/notify";
import { useConfirm } from "@/shared/components/ConfirmDialog";
import { formatDate } from "@/shared/utils/format";
import { APPLICATION_STATUS_OPTIONS } from "@/shared/constants/options";

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
  const applicants = query.data || [];

  const handleStatusChange = async (app, status) => {
    if (status === "REJECTED") {
      const ok = await confirm({
        title: `Reject ${app.teacher_name}?`,
        message: `They will be notified by email and in-app that their application for "${app.vacancy_title}" was not taken forward.`,
        confirmLabel: "Reject applicant",
        tone: "danger",
      });
      if (!ok) return;
    }
    updateStatus.mutate(
      { id: app.id, status },
      {
        onSuccess: () => notify.success(`Applicant status updated to ${APPLICATION_STATUS_OPTIONS.find((o) => o.value === status)?.label}.`),
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
                {applicants.map((app) => (
                  <tr key={app.id}>
                    <td>
                      <strong>
                        <Link to={`/faculty/${app.teacher_id}`} style={{ color: "inherit" }}>
                          {app.teacher_name}
                        </Link>
                      </strong>
                    </td>
                    <td>{app.vacancy_title}</td>
                    <td>{formatDate(app.applied_date || app.created_at)}</td>
                    <td>
                      {app.status === "WITHDRAWN" ? (
                        <span className="badge badge-rejected">Withdrawn</span>
                      ) : (
                        <select
                          className="input-select input-compact"
                          aria-label={`Status for ${app.teacher_name}`}
                          value={app.status || "APPLIED"}
                          disabled={updateStatus.isPending && updateStatus.variables?.id === app.id}
                          onChange={(e) => handleStatusChange(app, e.target.value)}
                        >
                          {APPLICATION_STATUS_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      {app.interview_date ? (
                        <span style={{ fontSize: "0.85rem", color: "var(--color-brand-accent)", fontWeight: 600, whiteSpace: "nowrap" }}>
                          <Calendar size={14} aria-hidden="true" /> {formatDate(app.interview_date)}
                          {app.interview_time ? ` · ${app.interview_time}` : ""}
                        </span>
                      ) : (
                        <button className="btn btn-outline btn-sm" disabled={app.status === "WITHDRAWN" || app.status === "REJECTED"} onClick={() => setDemoFor(app)}>
                          <Video size={14} /> Schedule Demo
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>

      {demoFor && <ScheduleDemoModal application={demoFor} onClose={() => setDemoFor(null)} />}
    </div>
  );
}
