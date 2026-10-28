import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Briefcase, Plus } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useDeleteVacancy, useMyVacancies } from "@/features/vacancies/hooks/useVacancies";
import VacancyFormModal from "@/features/vacancies/components/VacancyFormModal";
import VacanciesTable from "../components/VacanciesTable";
import { DashboardHeader } from "@/shared/components/layout/DashboardLayout";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { notify } from "@/shared/utils/notify";
import { useConfirm } from "@/shared/components/ConfirmDialog";

export default function InstituteVacanciesPage() {
  useDocumentTitle("My Vacancies");
  const { currentUser } = useAuth();
  const [params, setParams] = useSearchParams();
  const query = useMyVacancies();
  const remove = useDeleteVacancy();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null); // null | "new" | vacancy

  // /institute/vacancies?new=1 (quick action) opens the post form.
  useEffect(() => {
    if (params.get("new")) {
      setEditing("new");
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const vacancies = query.data || [];

  const handleDelete = async (v) => {
    const ok = await confirm({
      title: "Delete vacancy?",
      message: `"${v.title}" and all applications received for it will be permanently removed. To stop new applications but keep history, edit it and set the status to Closed instead.`,
      confirmLabel: "Delete vacancy",
      tone: "danger",
    });
    if (!ok) return;
    remove.mutate(v.id, {
      onSuccess: () => notify.info("Vacancy removed."),
      onError: (error) => notify.apiError(error, "Failed to delete vacancy."),
    });
  };

  return (
    <div>
      <DashboardHeader
        title="My Job Vacancies"
        subtitle="Manage active requirements and review applicant count"
        actions={
          <button className="btn btn-primary" onClick={() => setEditing("new")}>
            <Plus size={16} /> Post New Vacancy
          </button>
        }
      />

      <QueryState query={query} loadingLabel="Loading vacancies...">
        {vacancies.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No Job Postings Found"
            action={
              <button className="btn btn-primary" onClick={() => setEditing("new")}>
                Create First Vacancy
              </button>
            }
          >
            List teaching vacancies for IIT-JEE, NEET, or School faculties to begin receiving candidates.
          </EmptyState>
        ) : (
          <VacanciesTable
            vacancies={vacancies}
            showUrgency
            onEdit={setEditing}
            onDelete={handleDelete}
            deletingId={remove.isPending ? remove.variables : null}
          />
        )}
      </QueryState>

      {editing && (
        <VacancyFormModal vacancy={editing === "new" ? null : editing} defaultCity={currentUser?.city} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
