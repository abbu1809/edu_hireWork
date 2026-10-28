import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { useDispatch } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { loginUser, registerUser } from "../store/authSlice";
import { authApi } from "../api/auth.api";
import { useAuth } from "../hooks/useAuth";
import { GoogleButton, PasswordInput, RoleSelector, readAuthHash } from "../components/AuthFormParts";
import OtpStep from "../components/OtpStep";
import { notify } from "@/shared/utils/notify";
import { getErrorMessage } from "@/shared/api/httpClient";
import { homePathForRole } from "@/shared/utils/format";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { SIGNUP_SUBJECTS } from "@/shared/constants/options";

const MODES = ["login", "signup", "forgot", "reset_password"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HEADINGS = {
  login: ["Welcome Back", "Sign in to access your verified educator or recruiter dashboard"],
  signup: ["Create Your Account", "Join India's premier faculty hiring mediator network"],
  forgot: ["Reset Password", "Enter your email to receive recovery instructions"],
  reset_password: ["Set New Password", "Choose a strong password for your EduHire account"],
};

export default function AuthPage({ forcedMode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isSubmitting } = useAuth();

  const modeParam = forcedMode || searchParams.get("mode");
  const authMode = MODES.includes(modeParam) ? modeParam : "login";
  const signupRole = searchParams.get("role") === "institute" ? "institute" : "teacher";
  useDocumentTitle(HEADINGS[authMode][0]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [subject, setSubject] = useState(SIGNUP_SUBJECTS[0].value);
  const [recoveryToken, setRecoveryToken] = useState(null);
  const [busy, setBusy] = useState(false);
  // Sign-up email verification: { email, resendInSeconds } while the code step is shown.
  const [otpStage, setOtpStage] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const { data: authConfig } = useQuery({ queryKey: ["auth", "config"], queryFn: authApi.config, staleTime: 10 * 60 * 1000 });

  // Tokens in the URL hash: a password-recovery link, or an email-confirmation / OAuth return.
  useEffect(() => {
    const { accessToken, refreshToken, type, error } = readAuthHash();
    if (error) {
      notify.error(decodeURIComponent(error.replace(/\+/g, " ")));
      window.history.replaceState(null, "", location.pathname + location.search);
      return;
    }
    if (!accessToken) return;
    if (type === "recovery") {
      setRecoveryToken(accessToken);
      window.history.replaceState(null, "", "/auth/reset-password");
      if (!forcedMode) navigate("/auth/reset-password", { replace: true });
    } else {
      navigate(`/auth/callback${location.search}`, { replace: true, state: { accessToken, refreshToken } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const switchMode = (mode) => setSearchParams({ mode, role: signupRole });
  const switchRole = (role) => setSearchParams({ mode: authMode, role });

  const validate = () => {
    if (authMode === "reset_password") {
      if (!recoveryToken) return "This reset link is invalid or has expired. Please request a new one.";
      if (password.length < 6) return "New password must be at least 6 characters.";
      if (password !== confirmPassword) return "Passwords do not match.";
      return null;
    }
    if (!EMAIL_RE.test(email.trim())) return "Please enter a valid email address.";
    if (authMode !== "forgot" && password.length < 6) return "Password must be at least 6 characters.";
    if (authMode === "signup") {
      if (name.trim().length < 2) return signupRole === "teacher" ? "Please enter your full name." : "Please enter institute name.";
      if (phone.replace(/\D/g, "").length < 10) return "Please enter a valid 10-digit mobile number.";
      if (password !== confirmPassword) return "Passwords do not match.";
    }
    return null;
  };

  const createAccount = async () => {
    const payload = { name, email, password, phone, role: signupRole };
    if (signupRole === "teacher") Object.assign(payload, { city, subject });
    const result = await dispatch(registerUser(payload));
    if (registerUser.fulfilled.match(result)) {
      setOtpStage(null);
      if (result.payload.requiresVerification) {
        notify.success("Registration successful! Please check your email to verify your account.");
        setPassword("");
        setConfirmPassword("");
        switchMode("login");
      } else {
        notify.success(`Welcome ${name}! Your ${(result.payload.user?.role || signupRole).toUpperCase()} account is ready.`);
        navigate(homePathForRole(result.payload.user?.role), { replace: true });
      }
      return;
    }
    notify.error(result.payload?.message);
    if (result.payload?.details?.duplicate) {
      setOtpStage(null);
      switchMode("login");
    }
  };

  /** Emails a code and shows the verification step. Returns resend timing for the countdown. */
  const requestOtp = async () => {
    setBusy(true);
    try {
      const res = await authApi.sendOtp({ email: email.trim() });
      setOtpStage({ email: res.data.email, resendInSeconds: res.data.resendInSeconds });
      notify.success(res.message);
      return res.data;
    } catch (error) {
      const details = error?.response?.data?.details;
      notify.error(getErrorMessage(error, "Could not send the verification code."));
      if (details?.duplicate) switchMode("login");
      // Cooldown still running from an earlier send: show the code step anyway.
      if (error?.response?.status === 429 && details?.retryAfter && details.retryAfter <= 60) {
        setOtpStage((stage) => stage || { email: email.trim().toLowerCase(), resendInSeconds: details.retryAfter });
      }
      return { retryAfter: details?.retryAfter };
    } finally {
      setBusy(false);
    }
  };

  const verifyOtpAndCreate = async (code) => {
    setVerifying(true);
    try {
      await authApi.verifyOtp({ email: otpStage.email, code });
      await createAccount();
    } catch (error) {
      notify.error(getErrorMessage(error, "That code didn't work. Please try again."));
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) return notify.error(problem);

    if (authMode === "login") {
      const result = await dispatch(loginUser({ email, password }));
      if (loginUser.fulfilled.match(result)) {
        if (result.payload.needsRole) {
          navigate("/auth/callback", { state: { needsRole: true } });
          return;
        }
        notify.success("Logged in successfully!");
        navigate(location.state?.from || homePathForRole(result.payload.user?.role), { replace: true });
      } else {
        notify.error(result.payload?.message);
      }
      return;
    }

    if (authMode === "signup") {
      if (authConfig?.signupOtpRequired) await requestOtp();
      else await createAccount();
      return;
    }

    setBusy(true);
    try {
      if (authMode === "forgot") {
        await authApi.forgotPassword(email.trim());
        notify.success("Password reset link sent to your registered email.");
      } else {
        await authApi.resetPassword({ accessToken: recoveryToken, password });
        notify.success("Password updated successfully! You can now log in.");
        setPassword("");
        setConfirmPassword("");
        navigate("/auth?mode=login", { replace: true });
      }
    } catch (error) {
      notify.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      // New sign-ups carry the chosen role; sign-ins keep the account's existing role.
      const role = authMode === "signup" ? signupRole : undefined;
      const result = await authApi.googleUrl({ role, intent: authMode });
      window.location.assign(result.url);
    } catch (error) {
      notify.error(`Google sign-in error: ${getErrorMessage(error)}`);
      setBusy(false);
    }
  };

  const loading = isSubmitting || busy;
  const [title, subtitle] = HEADINGS[authMode];

  return (
    <div
      className="hero-warm-canvas"
      style={{ minHeight: "85vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "3rem 1rem" }}
    >
      <div className="card" style={{ maxWidth: "520px", width: "100%", padding: "clamp(1.5rem, 5vw, 2.5rem) clamp(1.25rem, 4vw, 2rem)" }}>
        <Link
          to="/"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "var(--text-secondary)", fontSize: "0.88rem", fontWeight: "600", marginBottom: "1.5rem" }}
        >
          <ArrowLeft size={16} /> Back to Homepage
        </Link>

        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 className="serif-headline" style={{ fontSize: "1.85rem", color: "var(--color-brand-house)", marginBottom: "0.5rem" }}>
            {title}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem" }}>{subtitle}</p>
        </div>

        {authMode === "signup" && otpStage ? (
          <OtpStep
            email={otpStage.email}
            resendInSeconds={otpStage.resendInSeconds}
            verifying={verifying || isSubmitting}
            onVerify={verifyOtpAndCreate}
            onResend={requestOtp}
            onBack={() => setOtpStage(null)}
          />
        ) : (
        <>
        {/* Sign In / Register toggle */}
        {(authMode === "login" || authMode === "signup") && (
          <div role="tablist" aria-label="Account access" className="segmented" style={{ marginBottom: "1.75rem" }}>
            {[
              ["login", "Sign In"],
              ["signup", "Register"],
            ].map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={authMode === mode}
                onClick={() => switchMode(mode)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {authMode === "signup" && <RoleSelector value={signupRole} onChange={switchRole} />}

        <form onSubmit={handleSubmit} noValidate>
          {authMode === "signup" && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-name">
                {signupRole === "teacher" ? "Full Name" : "Institute Name"}
              </label>
              <input
                id="auth-name"
                type="text"
                className="input-field"
                autoComplete={signupRole === "teacher" ? "name" : "organization"}
                placeholder={signupRole === "teacher" ? "e.g. Dr. Rajesh Sharma" : "e.g. Apex IIT-JEE Academy"}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          {authMode !== "reset_password" && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-email">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                className="input-field"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          {authMode === "signup" && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-phone">
                Phone Number
              </label>
              <input
                id="auth-phone"
                type="tel"
                className="input-field"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          )}

          {authMode === "signup" && signupRole === "teacher" && (
            <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
              <div className="form-group">
                <label className="form-label" htmlFor="auth-subject">
                  Primary Subject
                </label>
                <select id="auth-subject" className="input-select" style={{ width: "100%" }} value={subject} onChange={(e) => setSubject(e.target.value)}>
                  {SIGNUP_SUBJECTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="auth-city">
                  Location / City
                </label>
                <input
                  id="auth-city"
                  type="text"
                  className="input-field"
                  autoComplete="address-level2"
                  placeholder="e.g. Kota, Delhi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
            </div>
          )}

          {(authMode === "login" || authMode === "signup") && (
            <div className="form-group">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label className="form-label" htmlFor="auth-password">
                  Password
                </label>
                {authMode === "login" && (
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "var(--color-brand-accent)", fontSize: "0.82rem", fontWeight: "600", cursor: "pointer" }}
                    onClick={() => switchMode("forgot")}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <PasswordInput
                id="auth-password"
                value={password}
                onChange={setPassword}
                autoComplete={authMode === "signup" ? "new-password" : "current-password"}
              />
            </div>
          )}

          {authMode === "reset_password" && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-new-password">
                New Password
              </label>
              <PasswordInput id="auth-new-password" value={password} onChange={setPassword} autoComplete="new-password" />
            </div>
          )}

          {(authMode === "signup" || authMode === "reset_password") && (
            <div className="form-group">
              <label className="form-label" htmlFor="auth-confirm">
                {authMode === "signup" ? "Confirm Password" : "Confirm New Password"}
              </label>
              <PasswordInput id="auth-confirm" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: "1rem" }} disabled={loading}>
            {loading
              ? "Processing..."
              : {
                  login: "Sign In",
                  signup: authConfig?.signupOtpRequired ? "Continue — Verify Email" : "Create Account",
                  forgot: "Send Reset Link",
                  reset_password: "Update Password",
                }[authMode]}
          </button>
        </form>

        {(authMode === "forgot" || authMode === "reset_password") && (
          <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
            <button
              type="button"
              style={{ background: "none", border: "none", color: "var(--color-brand-accent)", fontSize: "0.88rem", fontWeight: "600", cursor: "pointer" }}
              onClick={() => navigate("/auth?mode=login")}
            >
              Back to Sign In
            </button>
          </div>
        )}

        {(authMode === "login" || authMode === "signup") && (
          <div style={{ marginTop: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
              <div style={{ flex: 1, height: "1px", background: "rgba(0,0,0,0.1)" }} />
              <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: "600" }}>OR</span>
              <div style={{ flex: 1, height: "1px", background: "rgba(0,0,0,0.1)" }} />
            </div>

            <GoogleButton
              onClick={handleGoogle}
              disabled={loading}
              label={authMode === "signup" ? `Sign up with Google as ${signupRole === "teacher" ? "Teacher" : "Institute"}` : "Continue with Google"}
            />
            {authMode === "login" && (
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.75rem" }}>
                New to EduHire? You'll choose Teacher or Institute after Google sign-in.
              </p>
            )}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}
