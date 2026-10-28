import { lazy, Suspense } from "react";
import { Outlet } from "react-router";
import Navbar from "./Navbar";
import Footer from "./Footer";
import FloatingFrap from "./FloatingFrap";
import ScrollToTop from "../ScrollToTop";
import LoadingState from "../LoadingState";
import { useSelector } from "react-redux";
import { useLinkPrefetch } from "@/shared/hooks/useLinkPrefetch";
import { useTableLabels } from "@/shared/hooks/useTableLabels";
import { selectCheckout } from "@/features/payments/store/paymentSlice";

// Only institutes ever open checkout, so its code is loaded on demand.
const RazorpayModal = lazy(() => import("@/features/payments/components/RazorpayModal"));

export default function MainLayout() {
  useLinkPrefetch();
  useTableLabels();
  const checkoutOpen = Boolean(useSelector(selectCheckout));

  return (
    <div className="app-container">
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
