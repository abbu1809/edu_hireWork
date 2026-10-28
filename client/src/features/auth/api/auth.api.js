import { http, unwrap } from "@/shared/api/httpClient";

export const authApi = {
  /** { signupOtpRequired, otpLength } — whether sign-up needs an emailed code. */
  config: () => unwrap(http.get("/auth/config")),
  sendOtp: ({ email, purpose = "SIGNUP" }) => http.post("/auth/otp/send", { email, purpose }).then((res) => res.data),
  verifyOtp: ({ email, code, purpose = "SIGNUP" }) => http.post("/auth/otp/verify", { email, code, purpose }).then((res) => res.data),

  register: (payload) => unwrap(http.post("/auth/register", payload)),
  login: (payload) => unwrap(http.post("/auth/login", payload)),
  logout: () => http.post("/auth/logout"),
  logoutAll: () => http.post("/auth/logout-all").then((res) => res.data),
  me: () => unwrap(http.get("/auth/me")),

  // Active sessions (devices)
  sessions: () => unwrap(http.get("/auth/sessions")),
  revokeSession: (id) => http.delete(`/auth/sessions/${id}`).then((res) => res.data),
  revokeOtherSessions: () => http.delete("/auth/sessions/others").then((res) => res.data),

  /** Google consent URL. `role` is sent for new sign-ups so the account is created with it. */
  googleUrl: ({ role, intent } = {}) => unwrap(http.get("/auth/google", { params: { role, intent } })),
  completeOAuth: (payload) => unwrap(http.post("/auth/oauth/complete", payload)),

  forgotPassword: (email) => http.post("/auth/forgot-password", { email }).then((res) => res.data),
  resetPassword: ({ accessToken, password }) =>
    http.post("/auth/reset-password", { accessToken, password }).then((res) => res.data),
  changePassword: (password) => http.put("/auth/password", { password }).then((res) => res.data),
};
