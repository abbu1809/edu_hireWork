import { Link } from "react-router";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useApplyToVacancy, useMyApplications } from "@/features/teacher/hooks/useTeacher";
import { notify } from "@/shared/utils/notify";
import { useThrottledCallback } from "@/shared/hooks/useThrottledCallback";
import { CheckCircle2, ShieldAlert } from "lucide-react";

/**
 * Apply action that adapts to who is looking: guests are sent to sign-up,
 * teachers apply in place, institutes and admins see a note.
 * Requires at least 75% profile completion for teachers.
 */
export default function ApplyButton({ vacancy, label = "Submit Application" }) {
  const { currentUser, role } = useAuth();
  const isTeacher = role === "teacher";
  const { data: applications = [] } = useMyApplications({ enabled: isTeacher });
  const apply = useApplyToVacancy();

  const completionPercent = currentUser?.profile_completion_percent ?? 0;
  const isUnderThreshold = isTeacher && completionPercent < 75;

  const handleApply = useThrottledCallback(() => {
    if (isUnderThreshold) {
      const missing = (currentUser?.missing_profile_items || []).join(", ");
      notify.error(
        `Profile is only ${completionPercent}% complete. Complete at least 75% of your profile before applying. Missing: ${missing || "required details"}.`
      );
      return;
    }
    apply.mutate(vacancy.id, {
      onSuccess: () => notify.success(`Application submitted successfully for ${vacancy.title}!`),
      onError: (error) =>
        error?.response?.status === 409 ? notify.warning("You have already applied for this vacancy.") : notify.apiError(error, "Application failed."),
    });
  });

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

  if (isUnderThreshold && !alreadyApplied) {
    return (
      <Link
        to="/teacher/profile"
        className="btn btn-danger-outline"
        style={{ width: "100%", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem" }}
        title={`Profile ${completionPercent}% complete. Complete missing sections to reach 75% before applying.`}
      >
        <ShieldAlert size={14} /> Profile {completionPercent}% (75% Req)
      </Link>
    );
  }

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
