import { useState } from "react";
import { Link } from "react-router";
import { Briefcase } from "lucide-react";
import { useAdminTeachers, useAdminVacancies, useMatchmake } from "../hooks/useAdmin";
import { DashboardHeader } from "@/shared/components/layout/DashboardLayout";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { notify } from "@/shared/utils/notify";
import { isVerifiedProfile } from "@/shared/utils/format";

export default function AdminVacanciesPage() {
  useDocumentTitle("Vacancies & Matchmaking");
  const vacanciesQuery = useAdminVacancies();
  const { data: teachers = [] } = useAdminTeachers();
  const matchmake = useMatchmake();
  const [vacancyId, setVacancyId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [note, setNote] = useState("");

  const vacancies = vacanciesQuery.data || [];
  const activeVacancies = vacancies.filter((v) => v.status === "Active");
  const eligibleTeachers = teachers.filter((t) => t.profile_status !== "Archived");

  const handleMatchmake = (e) => {
    e.preventDefault();
    if (!vacancyId || !teacherId) return notify.error("Please select both a vacancy and a teacher.");
    matchmake.mutate(
      { vacancyId, teacherId, note: note.trim() || undefined },
      {
        onSuccess: () => {
          notify.success("Mediator recommendation dispatched to institute!");
          setVacancyId("");
          setTeacherId("");
          setNote("");
        },
        onError: (error) => notify.apiError(error, "Could not send the recommendation."),
      }
    );
  };

  return (
    <div>
      <DashboardHeader title="Vacancies & Mediator Matchmaking" subtitle="Manually pair verified educators with active coaching requirements" />

      <div className="card" style={{ marginBottom: "2rem" }}>
        <h3 className="card-title" style={{ marginBottom: "1rem" }}>
          Direct Mediator Matchmaking
        </h3>
        <form onSubmit={handleMatchmake}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2" style={{ marginBottom: "1rem" }}>
            <div className="form-group">
              <label className="form-label" htmlFor="mm-vacancy">
                Select Vacancy
              </label>
              <select id="mm-vacancy" className="input-select" style={{ width: "100%" }} value={vacancyId} onChange={(e) => setVacancyId(e.target.value)}>
                <option value="">-- Choose Vacancy --</option>
                {activeVacancies.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.title} ({v.institute_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="mm-teacher">
                Select Teacher
              </label>
              <select id="mm-teacher" className="input-select" style={{ width: "100%" }} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                <option value="">-- Choose Educator --</option>
                {eligibleTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.primary_subject ? ` - ${t.primary_subject}` : ""}
                    {isVerifiedProfile(t) ? " (Verified)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="mm-note">
              Note to both parties (optional)
            </label>
            <input id="mm-note" type="text" className="input-field" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <button type="submit" className="btn btn-primary" disabled={matchmake.isPending}>
            {matchmake.isPending ? "Dispatching..." : "Dispatch Mediator Recommendation"}
          </button>
        </form>
      </div>

      <QueryState query={vacanciesQuery} loadingLabel="Loading vacancies...">
        {vacancies.length === 0 ? (
          <EmptyState icon={Briefcase} title="No Vacancies Posted Yet">
            Vacancies posted by institutes will appear here.
          </EmptyState>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Institute</th>
                  <th>Subject</th>
                  <th>Package</th>
                  <th>Status</th>
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
                    <td>{v.institute_name}</td>
                    <td>
                      <span className="badge badge-role">{v.subject}</span>
                    </td>
                    <td>{v.salary_range}</td>
                    <td>
                      <span className={`badge ${v.status === "Active" ? "badge-verified" : "badge-role"}`}>{v.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
    </div>
  );
}
