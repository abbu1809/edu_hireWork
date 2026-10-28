import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { useDispatch } from "react-redux";
import { completeOAuth } from "../store/authSlice";
import { RoleSelector, readAuthHash } from "../components/AuthFormParts";
import { tokenStorage } from "@/shared/api/tokenStorage";
import LoadingState from "@/shared/components/LoadingState";
import { notify } from "@/shared/utils/notify";
import { homePathForRole } from "@/shared/utils/format";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";

/**
 * Landing point after Google sign-in (and email-confirmation links).
 * Existing accounts go straight to their portal. A brand-new Google account
 * must pick Teacher or Institute first, so nobody is silently made a teacher.
 */
export default function AuthCallbackPage() {
  useDocumentTitle("Signing you in");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const started = useRef(false);

  const [tokens, setTokens] = useState(null);
  const [needsRole, setNeedsRole] = useState(null); // { email, name } when a role must be chosen
  const [role, setRole] = useState(searchParams.get("role") === "institute" ? "institute" : "teacher");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const finish = async (authTokens, chosenRole) => {
    setSubmitting(true);
    const result = await dispatch(completeOAuth({ ...authTokens, role: chosenRole }));
    setSubmitting(false);

    if (completeOAuth.fulfilled.match(result)) {
      const user = result.payload.user;
      notify.success(result.payload.created ? `Welcome ${user?.name}! Your ${user?.role?.toUpperCase()} account is ready.` : "Logged in successfully!");
      if (window.opener && window.opener !== window) {
        try {
          window.opener.postMessage({ type: "oauth_success", user }, window.location.origin);
          window.close();
          return;
        } catch {
          // If cross-origin opener access fails, continue regular navigation
        }
      }
      navigate(homePathForRole(user?.role), { replace: true });
      return;
    }
    if (result.payload?.details?.needsRole) {
      setNeedsRole({ email: result.payload.details.email, name: result.payload.details.name });
      return;
    }
    setError(result.payload?.message || "Sign-in could not be completed.");
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const hash = readAuthHash();
    const fromState = location.state || {};
    const authTokens = {
      accessToken: fromState.accessToken || hash.accessToken || tokenStorage.getAccessToken(),
      // Absent when finishing role selection after a password login: the existing session continues.
      refreshToken: fromState.refreshToken || hash.refreshToken || undefined,
    };
    // Remove tokens from the address bar.
    window.history.replaceState(null, "", location.pathname + location.search);

    if (hash.error) {
      setError(decodeURIComponent(hash.error.replace(/\+/g, " ")));
      return;
    }
    if (!authTokens.accessToken) {
      setError("This sign-in link is invalid or has expired. Please try again.");
      return;
    }
    setTokens(authTokens);
    // Only send a role the user explicitly chose on the sign-up screen.
    finish(authTokens, searchParams.get("role") || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="hero-warm-canvas" style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 1rem" }}>
        <div className="card" style={{ maxWidth: "480px", width: "100%", textAlign: "center", padding: "2rem" }}>
          <h1 className="serif-headline" style={{ fontSize: "1.6rem", color: "var(--color-brand-house)", marginBottom: "0.75rem" }}>
            Sign-in Failed
          </h1>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>{error}</p>
          <Link to="/auth?mode=login" className="btn btn-primary">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (!needsRole) return <LoadingState label="Completing secure sign-in..." />;

  return (
    <div className="hero-warm-canvas" style={{ minHeight: "85vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 1rem" }}>
      <div className="card" style={{ maxWidth: "520px", width: "100%", padding: "clamp(1.5rem, 5vw, 2.5rem) clamp(1.25rem, 4vw, 2rem)" }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <h1 className="serif-headline" style={{ fontSize: "1.85rem", color: "var(--color-brand-house)", marginBottom: "0.5rem" }}>
            How will you use EduHire?
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem" }}>
            {needsRole.name ? `Hi ${needsRole.name}, ` : ""}choose your account type to finish setting up{needsRole.email ? ` ${needsRole.email}` : ""}. This can't be changed later.
          </p>
        </div>

        <RoleSelector value={role} onChange={setRole} />

        <button className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={submitting || !tokens} onClick={() => finish(tokens, role)}>
          {submitting ? "Creating your account..." : `Continue as ${role === "teacher" ? "Teacher" : "Institute"}`}
        </button>
      </div>
    </div>
  );
}
