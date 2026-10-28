import toast from "react-hot-toast";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { getErrorMessage } from "@/shared/api/httpClient";

const VARIANTS = {
  success: { Icon: CheckCircle2, color: "var(--color-brand-accent)", className: "toast-success" },
  error: { Icon: XCircle, color: "var(--color-error)", className: "toast-error" },
  warning: { Icon: AlertTriangle, color: "var(--color-warning)", className: "toast-warning" },
  info: { Icon: Info, color: "var(--color-brand-green)", className: "toast-info" },
};

// Same card markup and classes as the original ToastContainer, rendered by react-hot-toast.
function ToastCard({ t, message, type }) {
  const { Icon, color, className } = VARIANTS[type] || VARIANTS.info;
  return (
    <div
      className={`toast ${className}`}
      style={{ maxWidth: "420px", width: "calc(100vw - 3rem)", opacity: t.visible ? 1 : 0, transition: "opacity 0.2s" }}
      role={type === "error" ? "alert" : "status"}
    >
      <div style={{ flexShrink: 0, marginTop: "1px" }}>
        <Icon size={20} color={color} />
      </div>
      <div style={{ flex: 1, wordBreak: "break-word", fontWeight: "500" }}>{message}</div>
      <button
        className="btn-icon"
        style={{
          width: "22px",
          height: "22px",
          background: "none",
          border: "none",
          color: "var(--text-muted)",
          cursor: "pointer",
          padding: 0,
          flexShrink: 0,
        }}
        onClick={() => toast.dismiss(t.id)}
        aria-label="Dismiss"
      >
        <X size={15} />
      </button>
    </div>
  );
}

const show = (type) => (message) =>
  toast.custom((t) => <ToastCard t={t} message={message} type={type} />, { duration: 5500 });

export const notify = {
  success: show("success"),
  error: show("error"),
  warning: show("warning"),
  info: show("info"),
  /** Shows the API's error message (or a fallback). */
  apiError: (error, fallback) => show("error")(getErrorMessage(error, fallback)),
};
