import { config } from "../config/env.js";
import { serviceDb, createAnonClient } from "../config/supabase.js";
import { ApiError, unwrap } from "../utils/ApiError.js";
import { normalizeEmail, normalizePhone } from "../utils/normalize.js";
import { calculateProfileCompletion } from "../utils/profileCompletion.js";
import { ProfileModel } from "../models/profile.model.js";
import { TeacherModel } from "../models/teacher.model.js";
import { InstituteModel } from "../models/institute.model.js";
import { StorageService } from "./storage.service.js";
import { mailMode } from "../config/mailer.js";
import { OtpService } from "./email/otp.service.js";
import { EmailService } from "./email/email.service.js";

/** Email OTP is required for sign-up when enabled and the server can actually send email. */
export const isSignupOtpRequired = () => config.email.requireSignupOtp && mailMode !== "disabled";

export const SELF_SERVICE_ROLES = ["teacher", "institute"];

const toSession = (session) =>
  session
    ? {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at,
      }
    : null;

const isDuplicateMessage = (message = "") =>
  /already registered|already exists|duplicate|23505|DUPLICATE_ACCOUNT/i.test(message);

export const AuthService = {
  toSession,

  /**
   * Builds the user object the client works with: profile + role-specific
   * record + computed profile completion. Returns null when the account has no
   * profile yet (OAuth user who has not picked a role).
   */
  async buildCurrentUser(authUser) {
    const profile = await ProfileModel.findById(serviceDb, authUser.id);
    if (!profile) return null;

    const role = profile.role.toLowerCase();
    let extended = {};
    if (role === "teacher") extended = (await TeacherModel.findById(serviceDb, authUser.id)) || {};
    if (role === "institute") extended = (await InstituteModel.findById(serviceDb, authUser.id)) || {};

    const merged = { ...profile, ...extended };
    const user = {
      ...extended,
      id: authUser.id,
      email: authUser.email,
      name: role === "institute" ? extended.institute_name || profile.name : profile.name,
      phone: extended.phone || profile.phone || "",
      city: extended.city || profile.city || "",
      state: extended.state || profile.state || "",
      role,
    };

    if (role === "teacher") {
      user.profile_completion_percent = calculateProfileCompletion(merged).percent;
    }

    // Avatars live in a public bucket; resolve any legacy stored value to a usable URL.
    const photo = extended.profile_photo_url || profile.profile_photo_url;
    if (photo) user.profile_photo_url = await StorageService.resolveUrl(serviceDb, "avatars", photo);

    return user;
  },

  async register({ name, email, password, phone, role, city, subject }) {
    const normEmail = normalizeEmail(email);
    const normPhone = normalizePhone(phone);
    const isAdminEmail = normEmail === config.adminEmail;
    let normalizedRole = String(role || "").toLowerCase();

    if (isAdminEmail) {
      // The single administrator account can be claimed once, by its configured email.
      if ((await ProfileModel.countAdmins(serviceDb)) > 0) {
        throw ApiError.conflict("An account already exists with these details. Please log in instead.", {
          duplicate: true,
        });
      }
      normalizedRole = "admin";
    } else if (!SELF_SERVICE_ROLES.includes(normalizedRole)) {
      throw ApiError.badRequest("Please choose either a Teacher or an Institute account.");
    }

    const { data: duplicate } = await serviceDb.rpc("check_account_exists", {
      p_email: normEmail,
      p_phone: normPhone || null,
      p_exclude_user_id: null,
    });
    if (duplicate?.exists) {
      throw ApiError.conflict("An account already exists with these details. Please log in instead.", {
        duplicate: true,
      });
    }

    const metadata = { name: name.trim(), role: normalizedRole.toUpperCase(), phone: normPhone };
    if (city) metadata.city = city.trim();
    if (subject) metadata.subject = subject.trim();

    const otpRequired = isSignupOtpRequired();
    if (otpRequired && !(await OtpService.isVerified({ email: normEmail, purpose: "SIGNUP" }))) {
      throw ApiError.badRequest("Please verify your email with the 6-digit code we sent you.", { otpRequired: true });
    }

    let data;
    let error;
    if (otpRequired) {
      // The address is already proven by the OTP, so create a confirmed user and sign in.
      const created = await serviceDb.auth.admin.createUser({
        email: normEmail,
        password,
        email_confirm: true,
        user_metadata: metadata,
      });
      error = created.error;
      if (!error) {
        const signIn = await createAnonClient().auth.signInWithPassword({ email: normEmail, password });
        error = signIn.error;
        data = signIn.data;
      }
    } else {
      ({ data, error } = await createAnonClient().auth.signUp({
        email: normEmail,
        password,
        options: { data: metadata, emailRedirectTo: `${config.clientUrl}/auth?mode=login` },
      }));
    }

    if (error) {
      if (isDuplicateMessage(error.message)) {
        throw ApiError.conflict("An account already exists with these details. Please log in instead.", {
          duplicate: true,
        });
      }
      throw ApiError.badRequest(error.message || "Registration failed. Please try again.");
    }

    if (isAdminEmail && data.user && !(await ProfileModel.findById(serviceDb, data.user.id))) {
      // The signup trigger only knows the default admin email; make sure the profile exists.
      unwrap(
        await serviceDb
          .from("profiles")
          .insert([{ id: data.user.id, name: metadata.name, email: normEmail, role: "ADMIN", phone: normPhone || null }]),
        "Could not create the administrator profile."
      );
    }

    if (otpRequired) await OtpService.consume({ email: normEmail, purpose: "SIGNUP" });

    const session = toSession(data.session);
    if (normalizedRole !== "admin") {
      EmailService.background(EmailService.send(normEmail, "welcome", { name: metadata.name, role: normalizedRole }));
    }
    return {
      requiresVerification: !session,
      session,
      user: session ? await this.buildCurrentUser(data.user) : null,
    };
  },

  async login({ email, password }) {
    const { data, error } = await createAnonClient().auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    if (error) {
      throw ApiError.unauthorized(error.message || "Invalid login credentials. Please check your email & password.");
    }
    const user = await this.buildCurrentUser(data.user);
    return { session: toSession(data.session), user, needsRole: !user };
  },

  async refresh(refreshToken) {
    const { data, error } = await createAnonClient().auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data?.session) throw ApiError.unauthorized("Your session has expired. Please sign in again.");
    return toSession(data.session);
  },

  async logout(accessToken) {
    try {
      // "local" = only this session. (supabase-js defaults to "global", which would
      // silently end the user's sessions on every other device too.)
      await serviceDb.auth.admin.signOut(accessToken, "local");
    } catch {
      // Token may already be invalid; the client discards it either way.
    }
  },

  /** Returns the Google consent URL. The browser comes back to /auth/callback with tokens. */
  async getGoogleAuthUrl({ role, intent }) {
    const params = new URLSearchParams();
    if (role && SELF_SERVICE_ROLES.includes(role)) params.set("role", role);
    if (intent) params.set("intent", intent);
    const redirectTo = `${config.clientUrl}/auth/callback${params.toString() ? `?${params}` : ""}`;

    const { data, error } = await createAnonClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) throw ApiError.badRequest(error?.message || "Google sign-in is not available.");
    return data.url;
  },

  /**
   * Finishes Google sign-in. Existing accounts keep their role. New accounts
   * must send the role the user picked; without it the API answers 409 so the
   * client can show the role picker.
   */
  async completeOAuth({ accessToken, refreshToken, role }) {
    const { data, error } = await serviceDb.auth.getUser(accessToken);
    if (error || !data?.user) throw ApiError.unauthorized("Google sign-in could not be verified. Please try again.");
    const authUser = data.user;
    const session = { accessToken, refreshToken, expiresAt: null };

    let user = await this.buildCurrentUser(authUser);
    if (user) return { session, user };

    const email = normalizeEmail(authUser.email);
    const isAdminEmail = email === config.adminEmail;
    const chosenRole = String(role || "").toLowerCase();

    if (!isAdminEmail && !SELF_SERVICE_ROLES.includes(chosenRole)) {
      throw ApiError.conflict("Choose whether you are joining as a Teacher or an Institute.", {
        needsRole: true,
        email,
        name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || "",
      });
    }

    if (isAdminEmail && (await ProfileModel.countAdmins(serviceDb)) > 0) {
      throw ApiError.conflict("The platform administrator account already exists.");
    }

    const dbRole = isAdminEmail ? "ADMIN" : chosenRole.toUpperCase();
    const name =
      (authUser.user_metadata?.full_name || authUser.user_metadata?.name || email.split("@")[0]).trim();
    const avatar = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null;

    unwrap(
      await serviceDb
        .from("profiles")
        .insert([{ id: authUser.id, name, email, role: dbRole, profile_photo_url: avatar }]),
      "Could not create your profile."
    );

    if (dbRole === "TEACHER") {
      unwrap(
        await serviceDb.from("teachers").insert([
          {
            id: authUser.id,
            name,
            email,
            profile_photo_url: avatar,
            profile_status: "Active",
            kyc_status: "Pending",
            verified: false,
            premium_badge: false,
          },
        ]),
        "Could not create your teacher profile."
      );
    } else if (dbRole === "INSTITUTE") {
      unwrap(
        await serviceDb.from("institutes").insert([
          {
            id: authUser.id,
            institute_name: name,
            email,
            verification_status: "Pending",
            verified: false,
            plan: "Standard",
          },
        ]),
        "Could not create your institute profile."
      );
    }

    user = await this.buildCurrentUser(authUser);
    if (dbRole !== "ADMIN") {
      EmailService.background(EmailService.send(email, "welcome", { name, role: dbRole.toLowerCase() }));
    }
    return { session, user, created: true };
  },

  async sendPasswordReset(email) {
    const { error } = await createAnonClient().auth.resetPasswordForEmail(normalizeEmail(email), {
      redirectTo: `${config.clientUrl}/auth/reset-password`,
    });
    if (error) throw ApiError.badRequest(error.message || "Password reset failed.");
  },

  /** Sets a new password using the recovery token from the reset email link. */
  async resetPassword({ accessToken, password }) {
    const { data, error } = await serviceDb.auth.getUser(accessToken);
    if (error || !data?.user) throw ApiError.unauthorized("This reset link has expired. Please request a new one.");
    await this.setPassword(data.user.id, password);
    return data.user.id;
  },

  async setPassword(userId, password) {
    const { error } = await serviceDb.auth.admin.updateUserById(userId, { password });
    if (error) throw ApiError.badRequest(error.message || "Failed to update password.");
    EmailService.background(EmailService.sendToUser(userId, "passwordChanged", {}, { preference: null }));
  },
};
