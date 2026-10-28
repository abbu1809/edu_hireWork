import { Link } from "react-router";
import { Send } from "lucide-react";
import { useMyApplications, useWithdrawApplication } from "../hooks/useTeacher";
import ApplicationsTable from "../components/ApplicationsTable";
import { DashboardHeader } from "@/shared/components/layout/DashboardLayout";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { notify } from "@/shared/utils/notify";
import { useConfirm } from "@/shared/components/ConfirmDialog";

export default function TeacherApplicationsPage() {
  useDocumentTitle("My Applications");
  const query = useMyApplications();
  const withdraw = useWithdrawApplication();
  const confirm = useConfirm();
  const applications = query.data || [];

  const handleWithdraw = async (app) => {
    const ok = await confirm({
      title: "Withdraw application?",
      message: `Your application for "${app.vacancy_title}" at ${app.institute_name} will be marked as withdrawn. You won't be able to apply to this vacancy again.`,
      confirmLabel: "Withdraw",
      cancelLabel: "Keep application",
      tone: "danger",
    });
    if (!ok) return;
    withdraw.mutate(app.id, {
      onSuccess: () => notify.info("Application withdrawn."),
      onError: (error) => notify.apiError(error, "Could not withdraw the application."),
    });
  };

  return (
    <div>
      <DashboardHeader title="My Applications & ATS Status" subtitle="Track your candidate pipeline status across all applied coaching roles" />

      <QueryState query={query} loadingLabel="Loading applications...">
        {applications.length === 0 ? (
          <EmptyState
            icon={Send}
            title="No Applications Found"
            action={
              <Link to="/teacher/jobs" className="btn btn-primary">
                Browse Openings
              </Link>
            }
          >
            You haven't submitted any job applications yet. Browse vacancies to start applying.
          </EmptyState>
        ) : (
          <ApplicationsTable
            applications={applications}
            showDemo
            onWithdraw={handleWithdraw}
            withdrawingId={withdraw.isPending ? withdraw.variables : null}
          />
        )}
      </QueryState>
    </div>
  );
}
