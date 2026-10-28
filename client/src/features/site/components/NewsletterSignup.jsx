import { useState } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import { useSubscribe } from "../hooks/useSite";
import { notify } from "@/shared/utils/notify";

/** Footer newsletter form (dark House Green surface). */
export default function NewsletterSignup() {
  const subscribe = useSubscribe();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("TEACHER");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return notify.error("Please enter a valid email address.");
    subscribe.mutate(
      { email: email.trim(), role, source: "footer" },
      {
        onSuccess: (res) => {
          notify.success(res.message);
          setEmail("");
        },
        onError: (error) => notify.apiError(error, "Could not subscribe right now."),
      }
    );
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "var(--radius-card)",
        padding: "clamp(1.25rem, 1rem + 1vw, 1.75rem)",
        marginBottom: "3rem",
        display: "grid",
        gap: "1.25rem",
        alignItems: "center",
      }}
      className="lg:grid-cols-[1fr_1.2fr]"
    >
      <div>
        <h2 style={{ color: "#fff", fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Mail size={20} color="var(--color-gold)" aria-hidden="true" /> Get hiring trends & new vacancies by email
        </h2>
        <p style={{ color: "var(--text-on-dark-muted)", fontSize: "0.9rem", marginTop: "0.35rem" }}>
          Salary insights, JEE/NEET hiring news and career guides. Unsubscribe anytime.
        </p>
      </div>

      {subscribe.isSuccess && !subscribe.data?.data?.alreadySubscribed ? (
        <p style={{ color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600 }} role="status">
          <CheckCircle2 size={20} color="var(--color-gold)" aria-hidden="true" /> You're subscribed — check your inbox.
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }} aria-label="Newsletter subscription">
          <label htmlFor="nl-email" className="sr-only">
            Email address
          </label>
          <input
            id="nl-email"
            type="email"
            autoComplete="email"
            className="input-field"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ flex: "2 1 220px", width: "auto" }}
            required
          />
          <label htmlFor="nl-role" className="sr-only">
            I am a
          </label>
          <select id="nl-role" className="input-select" value={role} onChange={(e) => setRole(e.target.value)} style={{ flex: "1 1 140px", width: "auto" }}>
            <option value="TEACHER">Teacher</option>
            <option value="INSTITUTE">Institute</option>
            <option value="OTHER">Other</option>
          </select>
          <button type="submit" className="btn btn-white" style={{ flex: "1 1 120px", minHeight: "46px" }} disabled={subscribe.isPending}>
            {subscribe.isPending ? "Subscribing..." : "Subscribe"}
          </button>
        </form>
      )}
    </div>
  );
}
