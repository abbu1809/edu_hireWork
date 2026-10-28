import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";
import MainLayout from "@/shared/components/layout/MainLayout";
import { ProtectedRoute, PublicOnlyRoute } from "@/shared/components/RouteGuards";
import LoadingState from "@/shared/components/LoadingState";
import { lazyWithPreload, registerPreload } from "@/shared/utils/lazyWithPreload";

// Public pages
import LandingPage from "@/features/home/pages/LandingPage";
const AuthPage = lazyWithPreload(() => import("@/features/auth/pages/AuthPage"));
const AuthCallbackPage = lazyWithPreload(() => import("@/features/auth/pages/AuthCallbackPage"));
const CareersPage = lazyWithPreload(() => import("@/features/vacancies/pages/CareersPage"));
const VacancyDetailPage = lazyWithPreload(() => import("@/features/vacancies/pages/VacancyDetailPage"));
const FacultyDirectoryPage = lazyWithPreload(() => import("@/features/faculty/pages/FacultyDirectoryPage"));
const FacultyProfilePage = lazyWithPreload(() => import("@/features/faculty/pages/FacultyProfilePage"));
const InstitutesPage = lazyWithPreload(() => import("@/features/site/pages/InstitutesPage"));
const ContentHubPage = lazyWithPreload(() => import("@/features/content/pages/ContentHubPage"));
const BlogPostDetailPage = lazyWithPreload(() => import("@/features/content/pages/BlogPostDetailPage"));
const StaticPolicyPages = lazyWithPreload(() => import("@/features/site/pages/StaticPolicyPages"));
const UnsubscribePage = lazyWithPreload(() => import("@/features/site/pages/UnsubscribePage"));
const NotificationsPage = lazyWithPreload(() => import("@/features/notifications/pages/NotificationsPage"));

// Teacher portal
const TeacherLayout = lazyWithPreload(() => import("@/features/teacher/pages/TeacherLayout"));
const TeacherOverviewPage = lazyWithPreload(() => import("@/features/teacher/pages/TeacherOverviewPage"));
const TeacherJobsPage = lazyWithPreload(() => import("@/features/teacher/pages/TeacherJobsPage"));
const TeacherApplicationsPage = lazyWithPreload(() => import("@/features/teacher/pages/TeacherApplicationsPage"));
const TeacherInterviewsPage = lazyWithPreload(() => import("@/features/teacher/pages/TeacherInterviewsPage"));
const TeacherProfilePage = lazyWithPreload(() => import("@/features/teacher/pages/TeacherProfilePage"));
const TeacherSettingsPage = lazyWithPreload(() => import("@/features/teacher/pages/TeacherSettingsPage"));

// Institute portal
const InstituteLayout = lazyWithPreload(() => import("@/features/institute/pages/InstituteLayout"));
const InstituteOverviewPage = lazyWithPreload(() => import("@/features/institute/pages/InstituteOverviewPage"));
const InstituteTalentPage = lazyWithPreload(() => import("@/features/institute/pages/InstituteTalentPage"));
const InstituteVacanciesPage = lazyWithPreload(() => import("@/features/institute/pages/InstituteVacanciesPage"));
const InstituteApplicantsPage = lazyWithPreload(() => import("@/features/institute/pages/InstituteApplicantsPage"));
const InstituteUnlockedPage = lazyWithPreload(() => import("@/features/institute/pages/InstituteUnlockedPage"));
const InstituteProfilePage = lazyWithPreload(() => import("@/features/institute/pages/InstituteProfilePage"));

// Admin portal
const AdminLayout = lazyWithPreload(() => import("@/features/admin/pages/AdminLayout"));
const AdminOverviewPage = lazyWithPreload(() => import("@/features/admin/pages/AdminOverviewPage"));
const AdminTeachersPage = lazyWithPreload(() => import("@/features/admin/pages/AdminTeachersPage"));
const AdminInstitutesPage = lazyWithPreload(() => import("@/features/admin/pages/AdminInstitutesPage"));
const AdminVacanciesPage = lazyWithPreload(() => import("@/features/admin/pages/AdminVacanciesPage"));
const AdminFinancePage = lazyWithPreload(() => import("@/features/admin/pages/AdminFinancePage"));
const AdminContentPage = lazyWithPreload(() => import("@/features/admin/pages/AdminContentPage"));
const AdminGovernancePage = lazyWithPreload(() => import("@/features/admin/pages/AdminGovernancePage"));
const AdminEmailPage = lazyWithPreload(() => import("@/features/admin/pages/AdminEmailPage"));

const STATIC_PAGES = ["about", "contact", "privacy", "terms", "disclaimer"];

// Hovering or focusing a link to these paths downloads the page chunk ahead of the click.
[
  ["/auth", AuthPage],
  ["/careers", CareersPage],
  ["/faculty", FacultyDirectoryPage],
  ["/institutes", InstitutesPage],
  ["/content-hub", ContentHubPage],
  ["/blog", ContentHubPage],
  ["/teacher-updates", ContentHubPage],
  ["/institute-updates", ContentHubPage],
  ["/notifications", NotificationsPage],
  ["/careers", VacancyDetailPage],
  ["/faculty", FacultyProfilePage],
  ["/teacher", TeacherLayout],
  ["/teacher", TeacherOverviewPage],
  ["/institute", InstituteOverviewPage],
  ["/admin", AdminOverviewPage],
  ["/teacher/jobs", TeacherJobsPage],
  ["/teacher/applications", TeacherApplicationsPage],
  ["/teacher/interviews", TeacherInterviewsPage],
  ["/teacher/profile", TeacherProfilePage],
  ["/teacher/settings", TeacherSettingsPage],
  ["/institute", InstituteLayout],
  ["/institute/talent", InstituteTalentPage],
  ["/institute/vacancies", InstituteVacanciesPage],
  ["/institute/applicants", InstituteApplicantsPage],
  ["/institute/unlocked", InstituteUnlockedPage],
  ["/institute/profile", InstituteProfilePage],
  ["/admin", AdminLayout],
  ["/admin/teachers", AdminTeachersPage],
  ["/admin/institutes", AdminInstitutesPage],
  ["/admin/vacancies", AdminVacanciesPage],
  ["/admin/finance", AdminFinancePage],
  ["/admin/content", AdminContentPage],
  ["/admin/governance", AdminGovernancePage],
  ["/admin/email", AdminEmailPage],
  ...STATIC_PAGES.map((page) => [`/${page}`, StaticPolicyPages]),
].forEach(([path, Component]) => registerPreload(path, Component));

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<LandingPage />} />

          {/* Auth */}
          <Route
            path="auth"
            element={
              <PublicOnlyRoute>
                <AuthPage />
              </PublicOnlyRoute>
            }
          />
          <Route path="auth/callback" element={<AuthCallbackPage />} />
          <Route path="auth/reset-password" element={<AuthPage forcedMode="reset_password" />} />
          <Route path="login" element={<Navigate to="/auth?mode=login" replace />} />
          <Route path="register" element={<Navigate to="/auth?mode=signup" replace />} />
          <Route path="forgot-password" element={<Navigate to="/auth?mode=forgot" replace />} />

          {/* Careers & faculty */}
          <Route path="careers" element={<CareersPage />} />
          <Route path="careers/:id" element={<VacancyDetailPage />} />
          <Route path="jobs" element={<Navigate to="/careers" replace />} />
          <Route path="faculty" element={<FacultyDirectoryPage />} />
          <Route path="faculty/:id" element={<FacultyProfilePage />} />
          <Route path="institutes" element={<InstitutesPage />} />

          {/* Content hub */}
          <Route path="content-hub" element={<ContentHubPage />} />
          <Route path="content-hub/:stream" element={<ContentHubPage />} />
          <Route path="blog" element={<ContentHubPage stream="BLOG" />} />
          <Route path="blog/:slug" element={<BlogPostDetailPage />} />
          <Route path="teacher-updates" element={<ContentHubPage stream="TEACHER_UPDATE" />} />
          <Route path="institute-updates" element={<ContentHubPage stream="INSTITUTE_UPDATE" />} />

          {/* Static & legal */}
          {STATIC_PAGES.map((page) => (
            <Route key={page} path={page} element={<StaticPolicyPages page={page} />} />
          ))}

          <Route path="unsubscribe" element={<UnsubscribePage />} />

          <Route
            path="notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />

          {/* Teacher portal */}
          <Route
            path="teacher"
            element={
              <ProtectedRoute allowedRoles={["teacher"]}>
                <TeacherLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<TeacherOverviewPage />} />
            <Route path="jobs" element={<TeacherJobsPage />} />
            <Route path="applications" element={<TeacherApplicationsPage />} />
            <Route path="interviews" element={<TeacherInterviewsPage />} />
            <Route path="profile" element={<TeacherProfilePage />} />
            <Route path="settings" element={<TeacherSettingsPage />} />
            <Route path="*" element={<Navigate to="/teacher" replace />} />
          </Route>

          {/* Institute portal */}
          <Route
            path="institute"
            element={
              <ProtectedRoute allowedRoles={["institute"]}>
                <InstituteLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<InstituteOverviewPage />} />
            <Route path="talent" element={<InstituteTalentPage />} />
            <Route path="vacancies" element={<InstituteVacanciesPage />} />
            <Route path="applicants" element={<InstituteApplicantsPage />} />
            <Route path="unlocked" element={<InstituteUnlockedPage />} />
            <Route path="profile" element={<InstituteProfilePage />} />
            <Route path="*" element={<Navigate to="/institute" replace />} />
          </Route>

          {/* Admin portal */}
          <Route
            path="admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminOverviewPage />} />
            <Route path="teachers" element={<AdminTeachersPage />} />
            <Route path="institutes" element={<AdminInstitutesPage />} />
            <Route path="vacancies" element={<AdminVacanciesPage />} />
            <Route path="finance" element={<AdminFinancePage />} />
            <Route path="content" element={<AdminContentPage />} />
            <Route path="governance" element={<AdminGovernancePage />} />
            <Route path="email" element={<AdminEmailPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
