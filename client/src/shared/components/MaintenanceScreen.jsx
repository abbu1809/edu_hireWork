import { Link } from "react-router";
import { Wrench, Lock } from "lucide-react";

export default function MaintenanceScreen({ message }) {
  const displayMessage =
    (typeof message === "string" && message.trim()) ||
    "FacultyKart is currently undergoing scheduled maintenance. We will be back shortly.";

  return (
    <div
      className="flex min-h-screen items-center justify-center p-6"
      style={{ background: "var(--color-canvas-warm)" }}
    >
      <div className="card w-full max-w-[540px] text-center" style={{ padding: "clamp(2rem, 5vw, 3rem)" }}>
        <img
          src="/logo.png"
          alt="FacultyKart"
          style={{ height: "48px", width: "auto", margin: "0 auto 1.25rem", display: "block" }}
        />
        <div
          style={{
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background: "rgba(217, 119, 6, 0.12)",
            color: "#b45309",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem",
          }}
        >
          <Wrench size={24} aria-hidden="true" />
        </div>
        <span className="badge badge-gold" style={{ marginBottom: "0.75rem" }}>
          Scheduled Maintenance
        </span>
        <h1
          className="serif-headline"
          style={{ color: "var(--color-brand-house)", fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 700, marginBottom: "0.75rem" }}
        >
          We'll Be Back Shortly
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.98rem", lineHeight: 1.65, marginBottom: "1.75rem" }}>
          {displayMessage}
        </p>
        <div style={{ borderTop: "1px solid var(--color-canvas-ceramic)", paddingTop: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
          <span>Need urgent help? <a href="mailto:contact@facultykart.in" style={{ color: "var(--color-brand-green)", fontWeight: 600 }}>contact@facultykart.in</a></span>
          <Link to="/auth?mode=login" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", color: "var(--text-secondary)", fontWeight: 600 }}>
            <Lock size={13} aria-hidden="true" /> Admin Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
