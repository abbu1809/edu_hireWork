import React from "react";
import { GraduationCap } from "lucide-react";

/** Last-resort screen if a render error escapes a page. */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("EduHire Application Runtime Error:", error, errorInfo);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="flex min-h-screen items-center justify-center p-8"
        style={{ background: "var(--color-canvas-warm)" }}
      >
        <div className="card w-full max-w-[520px] text-center" style={{ padding: "2.5rem" }}>
          <GraduationCap size={56} color="var(--color-brand-green)" aria-hidden="true" style={{ display: "block", margin: "0 auto 1rem" }} />
          <h2 style={{ color: "var(--color-brand-house)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            EduHire Bridge
          </h2>
          <div
            className="rounded-lg"
            style={{
              background: "var(--color-error-bg)",
              color: "var(--color-error)",
              padding: "1rem",
              fontSize: "0.95rem",
              lineHeight: 1.5,
              marginBottom: "1.5rem",
            }}
          >
            Something went wrong while loading this page. Please refresh to try again.
          </div>
          <button className="btn btn-primary" onClick={() => window.location.reload()}>
            Refresh Application
          </button>
        </div>
      </div>
    );
  }
}
