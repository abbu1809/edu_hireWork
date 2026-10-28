import { Link } from "react-router";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useApplyToVacancy, useMyApplications } from "@/features/teacher/hooks/useTeacher";
import { notify } from "@/shared/utils/notify";
import { useThrottledCallback } from "@/shared/hooks/useThrottledCallback";
import { CheckCircle2 } from "lucide-react";

/**
 * Apply action that adapts to who is looking: guests are sent to sign-up,
 * teachers apply in place, institutes and admins see a note.
 */
export default function ApplyButton({ vacancy, label = "Submit Application" }) {
  const { currentUser, role } = useAuth();
  const isTeacher = role === "teacher";
  const { data: applications = [] } = useMyApplications({ enabled: isTeacher });
  const apply = useApplyToVacancy();
  const handleApply = useThrottledCallback(() =>
    apply.mutate(vacancy.id, {
      onSuccess: () => notify.success(`Application submitted successfully for ${vacancy.title}!`),
      onError: (error) =>
        error?.response?.status === 409 ? notify.warning("You have already applied for this vacancy.") : notify.apiError(error, "Application failed."),
    })
  );

  if (!currentUser) {
    return (
      <Link to="/auth?mode=signup&role=teacher" className="btn btn-primary" style={{ width: "100%" }}>
        Apply for Vacancy
      </Link>
    );
  }

  if (!isTeacher) {
    return (
      <button className="btn btn-dark-outline" style={{ width: "100%" }} disabled>
        Teacher accounts can apply
      </button>
    );
  }

  // One application per teacher per vacancy (DB constraint) — a withdrawn one still counts.
  const existing = applications.find((a) => a.vacancy_id === vacancy.id);
  const alreadyApplied = Boolean(existing);
  const withdrawn = existing?.status === "WITHDRAWN";

  return (
    <button
      className={`btn ${alreadyApplied ? "btn-dark-outline" : "btn-primary"}`}
      style={{ width: "100%" }}
      disabled={alreadyApplied || apply.isPending}
      onClick={handleApply}
    >
      {withdrawn ? "Application Withdrawn" : alreadyApplied ? <><CheckCircle2 size={16} aria-hidden="true" /> Already Applied</> : apply.isPending ? "Submitting..." : label}
    </button>
  );
}
