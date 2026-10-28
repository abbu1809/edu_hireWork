import { useEffect, useRef, useState } from "react";
import { MailCheck, ArrowLeft, RotateCw } from "lucide-react";

const LENGTH = 6;

/**
 * Six-box one-time-code input. Supports typing, backspace, arrow keys,
 * pasting the whole code and SMS/email autofill (autocomplete="one-time-code").
 */
function CodeInput({ value, onChange, disabled, onComplete }) {
  const refs = useRef([]);
  const digits = Array.from({ length: LENGTH }, (_, i) => value[i] || "");

  const setAt = (index, digit) => {
    const next = digits.slice();
    next[index] = digit;
    const joined = next.join("").slice(0, LENGTH);
    onChange(joined);
    if (joined.length === LENGTH && !joined.includes("")) onComplete?.(joined);
  };

  const handleChange = (index, e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return setAt(index, "");
    if (raw.length > 1) {
      // Autofill or paste into one box.
      const code = raw.slice(0, LENGTH);
      onChange(code);
      refs.current[Math.min(code.length, LENGTH - 1)]?.focus();
      if (code.length === LENGTH) onComplete?.(code);
      return;
    }
    setAt(index, raw);
    if (index < LENGTH - 1) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
      setAt(index - 1, "");
    } else if (e.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    else if (e.key === "ArrowRight" && index < LENGTH - 1) refs.current[index + 1]?.focus();
  };

  const handlePaste = (e) => {
    const code = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!code) return;
    e.preventDefault();
    onChange(code);
    refs.current[Math.min(code.length, LENGTH - 1)]?.focus();
    if (code.length === LENGTH) onComplete?.(code);
  };

  return (
    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }} role="group" aria-label="6-digit verification code">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (refs.current[index] = el)}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          maxLength={index === 0 ? LENGTH : 1}
          className="input-field"
          aria-label={`Digit ${index + 1}`}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          style={{
            width: "min(48px, 13vw)",
            height: "56px",
            padding: 0,
            textAlign: "center",
            fontSize: "1.4rem",
            fontWeight: 700,
            letterSpacing: 0,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Email verification step shown during sign-up. The parent owns the API calls;
 * this component handles the code entry, resend countdown and states.
 */
export default function OtpStep({ email, onVerify, onResend, onBack, verifying, resendInSeconds = 60 }) {
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(resendInSeconds);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const submit = (value = code) => {
    if (value.length === LENGTH && !verifying) onVerify(value);
  };

  const resend = async () => {
    setResending(true);
    const result = await onResend();
    setResending(false);
    setCode("");
    setCountdown(result?.resendInSeconds ?? (result?.retryAfter || resendInSeconds));
  };

  return (
    <div>
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <span className="icon-circle" style={{ width: 56, height: 56, marginBottom: "0.85rem" }}>
          <MailCheck size={26} aria-hidden="true" />
        </span>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-brand-house)", marginBottom: "0.35rem" }}>Check your email</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem" }}>
          We sent a 6-digit code to <strong style={{ color: "var(--text-primary)", wordBreak: "break-all" }}>{email}</strong>. Enter it below to create your account.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <CodeInput value={code} onChange={setCode} disabled={verifying} onComplete={submit} />

        <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: "1.5rem" }} disabled={verifying || code.length !== LENGTH}>
          {verifying ? "Verifying..." : "Verify & Create Account"}
        </button>
      </form>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onBack}
          style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: "0.86rem", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
        >
          <ArrowLeft size={15} aria-hidden="true" /> Change details
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={countdown > 0 || resending}
          style={{
            background: "none",
            border: "none",
            color: countdown > 0 ? "var(--text-muted)" : "var(--color-brand-accent)",
            fontSize: "0.86rem",
            fontWeight: 700,
            cursor: countdown > 0 ? "default" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
          }}
          aria-live="polite"
        >
          <RotateCw size={15} aria-hidden="true" />
          {resending ? "Sending..." : countdown > 0 ? `Resend code in ${countdown}s` : "Resend code"}
        </button>
      </div>

      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center", marginTop: "1rem" }}>
        Can't find it? Check your spam or promotions folder. The code expires in 10 minutes.
      </p>
    </div>
  );
}
