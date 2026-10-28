import { LayoutDashboard, Users, Briefcase, UserCheck, Building, Unlock, ShieldCheck, Hourglass } from "lucide-react";
import DashboardLayout, { SidebarUserCard } from "@/shared/components/layout/DashboardLayout";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useMyVacancies } from "@/features/vacancies/hooks/useVacancies";
import { useReceivedApplications } from "../hooks/useInstitute";
import { initialOf, isVerifiedProfile } from "@/shared/utils/format";

export default function InstituteLayout() {
  const { currentUser } = useAuth();
  const { data: vacancies } = useMyVacancies();
  const { data: applicants } = useReceivedApplications();
  const unlockedCount = (currentUser?.unlocked_teachers || []).length;

  return (
    <DashboardLayout
      userCard={
        <SidebarUserCard
          initial={initialOf(currentUser?.name, "I")}
          name={currentUser?.name}
          subtitle="Recruiter Portal"
          avatarStyle={{ background: "var(--color-brand-house)" }}
        />
      }
      beforeNav={
        <div style={{ padding: "0 0.5rem 0.75rem" }}>
          {isVerifiedProfile(currentUser) ? (
            <span className="badge badge-verified" style={{ width: "100%", justifyContent: "center" }}>
              <ShieldCheck size={13} aria-hidden="true" /> Verified Institute
            </span>
          ) : (
            <span className="badge badge-pending" style={{ width: "100%", justifyContent: "center" }}>
              <Hourglass size={13} aria-hidden="true" /> Verification {currentUser?.verification_status || "Pending"}
            </span>
          )}
        </div>
      }
      navItems={[
        { to: "/institute", label: "Overview", icon: LayoutDashboard, end: true },
        { to: "/institute/talent", label: "Talent Discovery", icon: Users },
        { to: "/institute/vacancies", label: "My Vacancies", icon: Briefcase, count: vacancies?.length ?? 0 },
        { to: "/institute/applicants", label: "ATS Applicants", icon: UserCheck, count: applicants?.length ?? 0 },
        { to: "/institute/unlocked", label: "Unlocked Contacts", icon: Unlock, count: unlockedCount },
        { to: "/institute/profile", label: "Institute Profile", icon: Building },
      ]}
    />
  );
}
