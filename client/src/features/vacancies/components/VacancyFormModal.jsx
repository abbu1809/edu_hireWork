import { useState } from "react";
import Modal from "@/shared/components/Modal";
import { useCreateVacancy, useUpdateVacancy } from "../hooks/useVacancies";
import { notify } from "@/shared/utils/notify";
import { SUBJECTS, URGENCY_OPTIONS } from "@/shared/constants/options";

const empty = (city = "") => ({
  title: "",
  subject: SUBJECTS[0],
  city,
  classes: "",
  board: "",
  salary_range: "",
  min_experience: "",
  type: "Full-Time",
  urgency: "Normal",
  status: "Active",
  description: "",
});

const fromVacancy = (v) => ({
  ...empty(),
  ...Object.fromEntries(Object.entries(v).filter(([, value]) => value !== null && value !== undefined)),
  classes: Array.isArray(v.classes) ? v.classes.join(", ") : v.classes || "",
});

/** Create or edit a vacancy (original "Post New Teaching Vacancy" modal, plus the remaining fields). */
export default function VacancyFormModal({ vacancy, defaultCity, onClose }) {
  const isEdit = Boolean(vacancy);
  const [form, setForm] = useState(() => (isEdit ? fromVacancy(vacancy) : empty(defaultCity)));
  const create = useCreateVacancy();
  const update = useUpdateVacancy();
  const saving = create.isPending || update.isPending;

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return notify.error("Please enter a vacancy title.");
    if (!form.city.trim()) return notify.error("Please enter the city.");
    if (!form.salary_range.trim()) return notify.error("Please enter a salary range.");

    const payload = {
      title: form.title,
      subject: form.subject,
      city: form.city,
      classes: form.classes,
      board: form.board,
      salary_range: form.salary_range,
      min_experience: form.min_experience,
      type: form.type,
      urgency: form.urgency,
      description: form.description,
      ...(isEdit ? { status: form.status } : {}),
    };

    const options = {
      onSuccess: () => {
        notify.success(isEdit ? "Vacancy updated successfully." : "New teaching vacancy published live!");
        onClose();
      },
      onError: (error) => notify.apiError(error, isEdit ? "Failed to update vacancy." : "Failed to publish vacancy."),
    };
    if (isEdit) update.mutate({ id: vacancy.id, ...payload }, options);
    else create.mutate(payload, options);
  };

  return (
    <Modal title={isEdit ? "Edit Teaching Vacancy" : "Post New Teaching Vacancy"} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="vf-title">
            Job Title
          </label>
          <input
            id="vf-title"
            type="text"
            className="input-field"
            placeholder="e.g. Senior Faculty - IIT-JEE Advanced Physics"
            value={form.title}
            onChange={set("title")}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <div className="form-group">
            <label className="form-label" htmlFor="vf-subject">
              Subject
            </label>
            <select id="vf-subject" className="input-select" style={{ width: "100%" }} value={form.subject} onChange={set("subject")}>
              {[...new Set([...SUBJECTS, form.subject])].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="vf-city">
              City
            </label>
            <input id="vf-city" type="text" className="input-field" placeholder="e.g. Kota" value={form.city} onChange={set("city")} required />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <div className="form-group">
            <label className="form-label" htmlFor="vf-salary">
              Salary Range
            </label>
            <input id="vf-salary" type="text" className="input-field" placeholder="e.g. ₹18 LPA - ₹24 LPA" value={form.salary_range} onChange={set("salary_range")} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="vf-exp">
              Min Experience
            </label>
            <input id="vf-exp" type="text" className="input-field" placeholder="e.g. 3+ Years" value={form.min_experience} onChange={set("min_experience")} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <div className="form-group">
            <label className="form-label" htmlFor="vf-classes">
              Classes / Exams
            </label>
            <input id="vf-classes" type="text" className="input-field" placeholder="e.g. IIT-JEE Advanced, Class 11-12" value={form.classes} onChange={set("classes")} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="vf-board">
              Board
            </label>
            <input id="vf-board" type="text" className="input-field" placeholder="e.g. CBSE" value={form.board} onChange={set("board")} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <div className="form-group">
            <label className="form-label" htmlFor="vf-urgency">
              Urgency
            </label>
            <select id="vf-urgency" className="input-select" style={{ width: "100%" }} value={form.urgency} onChange={set("urgency")}>
              {URGENCY_OPTIONS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          {isEdit ? (
            <div className="form-group">
              <label className="form-label" htmlFor="vf-status">
                Status
              </label>
              <select id="vf-status" className="input-select" style={{ width: "100%" }} value={form.status} onChange={set("status")}>
                <option value="Active">Active</option>
                <option value="Filled">Filled</option>
                <option value="Closed">Closed</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label" htmlFor="vf-type">
                Employment Type
              </label>
              <select id="vf-type" className="input-select" style={{ width: "100%" }} value={form.type} onChange={set("type")}>
                <option value="Full-Time">Full-Time</option>
                <option value="Part-Time">Part-Time</option>
                <option value="Contract">Contract</option>
              </select>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="vf-desc">
            Role Description
          </label>
          <textarea
            id="vf-desc"
            className="input-field"
            rows={4}
            placeholder="Responsibilities, batch details, demo requirements, joining timeline..."
            value={form.description}
            onChange={set("description")}
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }} disabled={saving}>
          {saving ? (isEdit ? "Saving..." : "Publishing Requirement...") : isEdit ? "Save Changes" : "Publish Vacancy"}
        </button>
      </form>
    </Modal>
  );
}
