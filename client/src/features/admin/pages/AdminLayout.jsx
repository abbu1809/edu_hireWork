import { LayoutDashboard, Users, Building, Briefcase, DollarSign, FileText, Shield, Crown, Mail } from "lucide-react";
import DashboardLayout, { SidebarUserCard } from "@/shared/components/layout/DashboardLayout";
import { useAdminStats } from "../hooks/useAdmin";

export default function AdminLayout() {
  const { data: stats } = useAdminStats();

  return (
    <DashboardLayout
      userCard={
        <SidebarUserCard
          initial={<Crown size={20} aria-hidden="true" />}
          name="Admin Command"
          subtitle="Platform SuperAdmin"
          style={{ background: "var(--color-brand-house)", color: "#fff" }}
          avatarStyle={{ background: "var(--color-gold)", color: "var(--color-brand-house)" }}
          nameStyle={{ color: "#fff" }}
          subtitleStyle={{ color: "var(--color-gold)" }}
        />
      }
      navItems={[
        { to: "/admin", label: "Overview & KPIs", icon: LayoutDashboard, end: true },
        { to: "/admin/teachers", label: "Teachers & KYC", icon: Users, count: stats?.totalTeachers },
        { to: "/admin/institutes", label: "Institutes", icon: Building, count: stats?.totalInstitutes },
        { to: "/admin/vacancies", label: "Vacancies & Match", icon: Briefcase, count: stats?.totalVacancies },
        { to: "/admin/finance", label: "Finance & Revenue", icon: DollarSign },
        { to: "/admin/content", label: "Content Hub CMS", icon: FileText, count: stats?.totalArticles },
        { to: "/admin/governance", label: "Governance & Broadcast", icon: Shield },
        { to: "/admin/email", label: "Email Center", icon: Mail },
      ]}
    />
  );
}
