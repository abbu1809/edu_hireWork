import { useState } from "react";
import { Eye, EyeOff, GraduationCap, School } from "lucide-react";

export function PasswordInput({ id, value, onChange, autoComplete = "current-password", placeholder = "••••••••" }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        id={id}
        type={visible ? "text" : "password"}
        className="input-field"
        style={{ paddingRight: "2.75rem" }}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        style={{
          position: "absolute",
          right: "14px",
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-secondary)",
        }}
        onClick={() => setVisible(!visible)}
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

const ROLE_CARDS = [
  { id: "teacher", icon: GraduationCap, title: "Teacher / Faculty", hint: "Find coaching & school jobs" },
  { id: "institute", icon: School, title: "Institute / School", hint: "Post vacancies & hire faculty" },
];

/** Teacher / Institute picker used by sign-up and by first-time Google sign-in. */
export function RoleSelector({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Account type" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1.5rem" }}>
      {ROLE_CARDS.map((card) => {
        const selected = value === card.id;
        return (
          <button
            key={card.id}
            type="button"
            role="radio"
            aria-checked={selected}
            className="option-card"
            onClick={() => onChange(card.id)}
          >
            <card.icon size={26} color="var(--color-brand-green)" aria-hidden="true" style={{ display: "block", margin: "0 auto 0.35rem" }} />
            <div style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text-primary)" }}>{card.title}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{card.hint}</div>
          </button>
        );
      })}
    </div>
  );
}

export function GoogleButton({ onClick, disabled, loading = false, label = "Continue with Google" }) {
  return (
    <button
      type="button"
      className="btn btn-dark-outline"
      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", opacity: disabled || loading ? 0.75 : 1 }}
      onClick={onClick}
      disabled={disabled || loading}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
      </svg>
      {loading ? "Connecting to Google..." : label}
    </button>
  );
}

/** Reads Supabase tokens that arrive in the URL hash after Google sign-in or an email link. */
export const readAuthHash = () => {
  const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
  const params = new URLSearchParams(hash);
  return {
    accessToken: params.get("access_token"),
    refreshToken: params.get("refresh_token"),
    type: params.get("type"),
    error: params.get("error_description") || params.get("error"),
  };
};
