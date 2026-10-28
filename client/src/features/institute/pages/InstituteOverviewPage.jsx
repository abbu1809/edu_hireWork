import { useState } from "react";
import { Link } from "react-router";
import { Briefcase, UserCheck, Unlock, Users, Plus, Search } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useMyVacancies } from "@/features/vacancies/hooks/useVacancies";
import { usePublicStats } from "@/features/site/hooks/useSite";
import VacancyFormModal from "@/features/vacancies/components/VacancyFormModal";
import { useReceivedApplications } from "../hooks/useInstitute";
import VacanciesTable from "../components/VacanciesTable";
import { DashboardHeader, KpiCard } from "@/shared/components/layout/DashboardLayout";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";

export default function InstituteOverviewPage() {
  useDocumentTitle("Institute Recruiter HQ");
  const { currentUser } = useAuth();
  const vacanciesQuery = useMyVacancies();
  const { data: applicants = [] } = useReceivedApplications();
  const { data: stats } = usePublicStats();
  const [showPostModal, setShowPostModal] = useState(false);

  const vacancies = vacanciesQuery.data || [];
  const activeCount = vacancies.filter((v) => v.status === "Active").length;

  return (
    <div>
      <DashboardHeader
        title="Institute Recruiter HQ"
        subtitle={`Welcome back, ${currentUser?.name}. Manage faculty recruitment pipelines and whiteboard demo rounds.`}
        actions={
          <>
            <Link to="/institute/talent" className="btn btn-outline">
              <Search size={16} /> Search Faculty
            </Link>
            <button className="btn btn-primary" onClick={() => setShowPostModal(true)}>
              <Plus size={16} /> Post Vacancy
            </button>
          </>
        }
      />

      <div className="kpi-grid">
        <KpiCard icon={Briefcase} label="Active Vacancies" value={activeCount} />
        <KpiCard icon={UserCheck} label="Total Applicants" value={applicants.length} />
        <KpiCard icon={Unlock} label="Unlocked Profiles" value={(currentUser?.unlocked_teachers || []).length} />
        <KpiCard icon={Users} label="Faculty Talent Pool" value={stats?.teachers ?? "—"} />
      </div>

      <div className="card" style={{ marginBottom: "2rem" }}>
        <div className="card-header">
          <h3 className="card-title">My Posted Vacancies</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowPostModal(true)}>
            <Plus size={14} /> New Vacancy
          </button>
        </div>

        <QueryState query={vacanciesQuery} loadingLabel="Loading vacancies...">
          {vacancies.length === 0 ? (
            <EmptyState
              bare
              icon={Briefcase}
              iconSize={28}
              title="No Vacancies Posted Yet"
              action={
                <button className="btn btn-primary btn-sm" onClick={() => setShowPostModal(true)}>
                  Post Your First Vacancy
                </button>
              }
            >
              Post your subject requirements (e.g. Senior Faculty Physics, NEET Zoology) to receive verified applications.
            </EmptyState>
          ) : (
            <VacanciesTable vacancies={vacancies.slice(0, 6)} />
          )}
        </QueryState>
      </div>

      {showPostModal && <VacancyFormModal defaultCity={currentUser?.city} onClose={() => setShowPostModal(false)} />}
    </div>
  );
}
