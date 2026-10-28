import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import { MailX, CheckCircle2 } from "lucide-react";
import { useUnsubscribe } from "../hooks/useSite";
import LoadingState from "@/shared/components/LoadingState";
import { getErrorMessage } from "@/shared/api/httpClient";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";

/** One-click unsubscribe target for newsletter emails: /unsubscribe?token=… */
export default function UnsubscribePage() {
  useDocumentTitle("Unsubscribe");
  const [params] = useSearchParams();
  const token = params.get("token");
  const unsubscribe = useUnsubscribe();
  const started = useRef(false);

  useEffect(() => {
    if (token && !started.current) {
      started.current = true;
      unsubscribe.mutate(token);
    }
  }, [token, unsubscribe]);

  if (token && (unsubscribe.isPending || unsubscribe.isIdle)) return <LoadingState label="Updating your email preferences..." />;

  const ok = unsubscribe.isSuccess;
  return (
    <div className="hero-warm-canvas" style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ maxWidth: "480px", width: "100%", textAlign: "center", padding: "2.25rem 1.75rem" }}>
        <span className="icon-circle" style={{ width: 60, height: 60, marginBottom: "1rem" }}>
          {ok ? <CheckCircle2 size={28} aria-hidden="true" /> : <MailX size={28} aria-hidden="true" />}
        </span>
        <h1 style={{ fontSize: "1.5rem", color: "var(--color-brand-house)", marginBottom: "0.5rem" }}>
          {ok ? "You've been unsubscribed" : "We couldn't process that link"}
        </h1>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          {ok
            ? `${unsubscribe.data?.data?.email || "Your address"} will no longer receive EduHire Bridge newsletters. Account emails (applications, demos, payments) are not affected.`
            : token
              ? getErrorMessage(unsubscribe.error, "This unsubscribe link is invalid or has expired.")
              : "This unsubscribe link is missing its token. Please use the link from your email."}
        </p>
        <Link to="/" className="btn btn-primary">
          Back to EduHire Bridge
        </Link>
      </div>
    </div>
  );
}
