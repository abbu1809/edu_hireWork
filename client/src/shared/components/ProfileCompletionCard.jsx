import { Link } from "react-router";
import { useDispatch } from "react-redux";
import { AlertCircle, CheckCircle, ArrowRight, ShieldAlert, Sparkles } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { openFacultyCheckout } from "@/features/payments/store/paymentSlice";

export default function ProfileCompletionCard({
  role = "teacher",
  percent = 0,
  missingItems = [],
  actionUrl = role === "teacher" ? "/teacher/profile" : "/institute/profile",
  style,
}) {
  const dispatch = useDispatch();
  const { currentUser } = useAuth();
  const isEligible = percent >= 75;
  const isComplete = percent >= 100;
  const isFeePaid = Boolean(currentUser?.is_platform_fee_paid);
  const actionText = role === "teacher" ? "apply for teaching jobs" : "publish job vacancies";

  if (isComplete && (role !== "teacher" || isFeePaid)) return null;

  return (
    <div
      style={{
        padding: "1.25rem 1.5rem",
        borderRadius: "12px",
        marginBottom: "1.5rem",
        background: isEligible
          ? "linear-gradient(135deg, rgba(20, 83, 45, 0.05) 0%, rgba(22, 101, 52, 0.02) 100%)"
          : "linear-gradient(135deg, rgba(220, 38, 38, 0.06) 0%, rgba(239, 68, 68, 0.02) 100%)",
        border: `1px solid ${isEligible ? "rgba(22, 163, 74, 0.25)" : "rgba(220, 38, 38, 0.25)"}`,
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
        ...style,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {isEligible ? (
              <CheckCircle size={20} color="#16a34a" />
            ) : (
              <ShieldAlert size={20} color="#dc2626" />
            )}
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", margin: 0 }}>
              Profile Completion: <span style={{ color: isEligible ? "#16a34a" : "#dc2626" }}>{percent}%</span>
              {!isEligible && (
                <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#dc2626", marginLeft: "0.5rem", background: "rgba(220, 38, 38, 0.1)", padding: "0.2rem 0.5rem", borderRadius: "4px" }}>
                  75% Required to {role === "teacher" ? "Apply" : "Post"}
                </span>
              )}
            </h3>
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0.35rem 0 0" }}>
            {isEligible
              ? `Great job! Your profile meets the 75% minimum threshold to ${actionText}. Complete the remaining sections for higher visibility.`
              : `Your profile must be at least 75% complete to ${actionText}. Please complete the missing sections below.`}
          </p>
        </div>

        <Link
          to={actionUrl}
          className={`btn btn-sm ${isEligible ? "btn-outline" : "btn-primary"}`}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", alignSelf: "center" }}
        >
          {isEligible ? "Improve Profile" : "Complete Profile"} <ArrowRight size={14} />
        </Link>
      </div>

      {/* Progress Bar */}
      <div
        className="progress"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          height: "8px",
          background: "rgba(0, 0, 0, 0.08)",
          borderRadius: "999px",
          overflow: "hidden",
          margin: "0.5rem 0 0.85rem",
        }}
      >
        <span
          style={{
            display: "block",
            height: "100%",
            width: `${percent}%`,
            background: isEligible
              ? "linear-gradient(90deg, #16a34a, #22c55e)"
              : "linear-gradient(90deg, #ef4444, #f97316)",
            transition: "width 0.4s ease",
          }}
        />
      </div>

      {/* Missing Sections Checklist */}
      {missingItems && missingItems.length > 0 && (
        <div style={{ marginTop: "0.5rem", background: "rgba(255, 255, 255, 0.6)", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px dashed var(--border-color)" }}>
          <div style={{ fontSize: "0.78rem", fontWeight: "700", color: isEligible ? "var(--text-secondary)" : "#b91c1c", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.03em" }}>
            {isEligible ? "Remaining to reach 100%:" : "Missing Sections (Must complete to reach 75%):"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {missingItems.map((item, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: "0.78rem",
                  padding: "0.2rem 0.55rem",
                  borderRadius: "6px",
                  background: isEligible ? "rgba(0,0,0,0.04)" : "rgba(239, 68, 68, 0.1)",
                  color: isEligible ? "var(--text-primary)" : "#991b1b",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  fontWeight: "500",
                }}
              >
                <span style={{ fontSize: "0.7rem" }}>•</span> {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Teacher 75%+ One-Time ₹9 Activation Prompt */}
      {role === "teacher" && isEligible && !isFeePaid && (
        <div
          style={{
            marginTop: "0.85rem",
            padding: "0.85rem 1rem",
            background: "linear-gradient(135deg, rgba(234, 179, 8, 0.12) 0%, rgba(202, 138, 4, 0.06) 100%)",
            borderRadius: "8px",
            border: "1px solid rgba(202, 138, 4, 0.35)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            <div style={{ fontWeight: "700", color: "#854d0e", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.92rem" }}>
              <Sparkles size={16} color="#ca8a04" /> One-Time Profile Activation (₹9)
            </div>
            <div style={{ fontSize: "0.82rem", color: "#713f12", marginTop: "0.2rem" }}>
              Congratulations on reaching {percent}%! Pay ₹9 once to activate your verified candidate status and apply for vacancies.
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => dispatch(openFacultyCheckout())}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontWeight: "700" }}
          >
            Pay ₹9 & Activate
          </button>
        </div>
      )}

      {role === "teacher" && isEligible && isFeePaid && (
        <div style={{ marginTop: "0.6rem", fontSize: "0.82rem", color: "#15803d", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          <CheckCircle size={15} color="#16a34a" /> One-Time Registration Fee Paid · Verified candidate eligible for all vacancies!
        </div>
      )}
    </div>
  );
}

