import { useDispatch, useSelector } from "react-redux";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Lock, Phone, FileText, X } from "lucide-react";
import { closeCheckout, payForTeacherUnlock, selectCheckout, selectPaymentProcessing } from "../store/paymentSlice";
import { usePaymentConfig } from "../hooks/usePaymentConfig";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { refreshCurrentUser } from "@/features/auth/store/authSlice";
import { notify } from "@/shared/utils/notify";
import { formatCurrency } from "@/shared/utils/format";

/**
 * Confirmation step before Razorpay Checkout opens. Razorpay's own window
 * collects the UPI / card / netbanking details; nothing is simulated here.
 */
export default function RazorpayModal() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const checkout = useSelector(selectCheckout);
  const processing = useSelector(selectPaymentProcessing);
  const { currentUser } = useAuth();
  const { data: config, isLoading } = usePaymentConfig();

  if (!checkout) return null;

  const fee = config?.unlockFee;
  const enabled = Boolean(config?.enabled);

  const handlePay = async () => {
    const result = await dispatch(
      payForTeacherUnlock({
        teacherId: checkout.teacherId,
        customer: { name: currentUser?.name, email: currentUser?.email, phone: currentUser?.phone },
      })
    );
    if (payForTeacherUnlock.fulfilled.match(result)) {
      notify.success(`Payment of ${formatCurrency(result.payload.amount)} received. Contact & Resume unlocked for ${result.payload.teacherName}!`);
      dispatch(refreshCurrentUser());
      queryClient.invalidateQueries({ queryKey: ["institute"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } else if (!result.payload?.dismissed) {
      notify.error(result.payload?.message || "Payment could not be completed.");
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="razorpay-title">
      <div className="modal-content" style={{ padding: 0, maxWidth: "460px", overflow: "hidden" }}>
        {/* Header */}
        <div className="relative px-6 pb-6 pt-5 text-white" style={{ background: "var(--color-brand-house)" }}>
          <button
            className="modal-close-btn absolute right-4 top-3"
            style={{ color: "rgba(255,255,255,0.8)" }}
            onClick={() => dispatch(closeCheckout())}
            disabled={processing}
            aria-label="Close"
          >
            <X size={20} aria-hidden="true" />
          </button>
          <div
            className="mb-3 inline-flex items-center gap-2 rounded-pill px-3 py-1 text-xs font-bold tracking-wide"
            style={{ background: "rgba(255,255,255,0.12)" }}
          >
            <ShieldCheck size={14} /> RAZORPAY SECURE
          </div>
          <p className="mb-1 text-sm opacity-90">EduHire Bridge Mediator Services</p>
          <h2 id="razorpay-title" className="text-3xl font-extrabold" style={{ color: "#fff" }}>
            {isLoading ? "…" : fee ? formatCurrency(fee) : "—"}
          </h2>
          <span className="text-sm" style={{ color: "var(--color-gold-light)" }}>
            Unlock Contact & Resume: {checkout.teacherName}
          </span>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
            Paying as: <strong style={{ color: "var(--text-primary)" }}>{currentUser?.name || currentUser?.email}</strong>
          </div>

          <ul className="mb-5 flex flex-col gap-2 rounded-card p-4 text-sm" style={{ background: "var(--color-canvas-warm)" }}>
            <li className="flex items-center gap-2">
              <Phone size={15} color="var(--color-brand-accent)" /> Direct phone number & email
            </li>
            <li className="flex items-center gap-2">
              <FileText size={15} color="var(--color-brand-accent)" /> Full resume download
            </li>
            <li className="flex items-center gap-2">
              <Lock size={15} color="var(--color-brand-accent)" /> Saved to your Unlocked Contacts
            </li>
          </ul>

          {!isLoading && !enabled && (
            <div
              className="mb-4 rounded-card p-3 text-sm"
              style={{ background: "var(--color-warning-bg)", color: "var(--color-warning)" }}
            >
              Online payments are not configured yet. Please contact support to unlock this profile.
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              className="btn btn-primary btn-lg"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={handlePay}
              disabled={processing || isLoading || !enabled}
            >
              {processing ? "Processing via Razorpay..." : fee ? `Pay ${formatCurrency(fee)} Now` : "Pay Now"}
            </button>
            <button
              className="btn btn-outline btn-sm"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => dispatch(closeCheckout())}
              disabled={processing}
            >
              Cancel Transaction
            </button>
          </div>

          <div className="mt-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            UPI, Cards, NetBanking & PayLater • PCI-DSS Level 1 Compliant • Powered by Razorpay
          </div>
        </div>
      </div>
    </div>
  );
}
