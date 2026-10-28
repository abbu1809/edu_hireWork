import { LayoutDashboard, Briefcase, Send, Video, User, Settings, ShieldCheck, Hourglass } from "lucide-react";
import DashboardLayout, { SidebarUserCard } from "@/shared/components/layout/DashboardLayout";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useMyApplications, useMyInterviews } from "../hooks/useTeacher";
import { initialOf, isVerifiedProfile } from "@/shared/utils/format";

export default function TeacherLayout() {
  const { currentUser } = useAuth();
  const { data: applications } = useMyApplications();
  const { data: interviews } = useMyInterviews();

  return (
    <DashboardLayout
      userCard={
        <SidebarUserCard
          initial={initialOf(currentUser?.name, "T")}
          photoUrl={currentUser?.profile_photo_url}
          name={currentUser?.name}
          subtitle="Educator Portal"
        />
      }
      beforeNav={
        <div style={{ padding: "0 0.5rem 0.75rem" }}>
          {isVerifiedProfile(currentUser) ? (
            <span className="badge badge-verified" style={{ width: "100%", justifyContent: "center" }}>
              <ShieldCheck size={13} aria-hidden="true" /> KYC Verified Educator
            </span>
          ) : (
            <span className="badge badge-pending" style={{ width: "100%", justifyContent: "center" }}>
              <Hourglass size={13} aria-hidden="true" /> KYC Under Review
            </span>
          )}
        </div>
      }
      navItems={[
        { to: "/teacher", label: "Overview", icon: LayoutDashboard, end: true },
        { to: "/teacher/jobs", label: "Explore Vacancies", icon: Briefcase },
        { to: "/teacher/applications", label: "My Applications", icon: Send, count: applications?.length ?? 0 },
        { to: "/teacher/interviews", label: "Demo Lectures", icon: Video, count: interviews?.length ?? 0 },
        { to: "/teacher/profile", label: "Profile & KYC", icon: User },
        { to: "/teacher/settings", label: "Settings", icon: Settings },
      ]}
    />
  );
}
