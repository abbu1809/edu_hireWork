import { lazy, Suspense } from "react";
import { Link, Outlet, useLocation } from "react-router";
import Navbar from "./Navbar";
import Footer from "./Footer";
import FloatingFrap from "./FloatingFrap";
import ScrollToTop from "../ScrollToTop";
import LoadingState from "../LoadingState";
import MaintenanceScreen from "../MaintenanceScreen";
import { useSelector } from "react-redux";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { usePlatformSettings } from "@/features/site/hooks/useSite";
import { useLinkPrefetch } from "@/shared/hooks/useLinkPrefetch";
import { useTableLabels } from "@/shared/hooks/useTableLabels";
import { selectCheckout } from "@/features/payments/store/paymentSlice";

// Only institutes / teachers ever open checkout, so its code is loaded on demand.
const RazorpayModal = lazy(() => import("@/features/payments/components/RazorpayModal"));

const AUTH_PATHS = ["/auth", "/login", "/register", "/forgot-password"];

export default function MainLayout() {
  useLinkPrefetch();
  useTableLabels();
  const { pathname } = useLocation();
  const { role } = useAuth();
  const { data: settings } = usePlatformSettings();
  const checkoutOpen = Boolean(useSelector(selectCheckout));

  const isMaintenance = settings?.maintenance_mode === true || settings?.maintenance_mode === "true";
  const isAdmin = role === "admin";
  const isAuthRoute = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (isMaintenance && !isAdmin && !isAuthRoute) {
    return <MaintenanceScreen message={settings?.maintenance_message} />;
  }

  return (
    <div className="app-container">
      {isMaintenance && isAdmin && (
        <div
          role="status"
          style={{
            background: "#991b1b",
            color: "#ffffff",
            textAlign: "center",
            padding: "0.45rem 1rem",
            fontSize: "0.84rem",
            fontWeight: 600,
          }}
        >
          Maintenance Mode is ACTIVE — only administrators can currently access the platform.{" "}
          <Link to="/admin/governance" style={{ color: "#fde68a", textDecoration: "underline", marginLeft: "0.4rem" }}>
            Manage in Governance
          </Link>
        </div>
      )}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <ScrollToTop />
      <Navbar />
      {checkoutOpen && (
        <Suspense fallback={null}>
          <RazorpayModal />
        </Suspense>
      )}
      <FloatingFrap />
      <main id="main-content" className="main-content" tabIndex={-1}>
        {/* Page-level boundary keeps the navbar and footer on screen while a page chunk loads. */}
        <Suspense fallback={<LoadingState />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
