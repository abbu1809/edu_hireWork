import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { authApi } from "../api/auth.api";
import { applySession, clearSession, broadcastLogout, getErrorMessage, refreshAccessToken } from "@/shared/api/httpClient";

const toRejection = (error, fallback) => ({
  message: getErrorMessage(error, fallback),
  status: error?.response?.status,
  details: error?.response?.data?.details || null,
});

/**
 * Restores the session on page load: the httpOnly refresh cookie is exchanged
 * for a fresh access token (kept in memory) and the current user, in one call.
 * No cookie / expired session → signed out (not an error).
 */
export const bootstrapSession = createAsyncThunk("auth/bootstrap", async () => {
  try {
    const result = await refreshAccessToken();
    return { user: result.user || null, needsRole: result.needsRole };
  } catch {
    clearSession();
    return { user: null };
  }
});

export const loginUser = createAsyncThunk("auth/login", async ({ email, password }, { rejectWithValue }) => {
  try {
    const result = await authApi.login({ email, password });
    applySession(result.session);
    return result;
  } catch (error) {
    return rejectWithValue(toRejection(error, "Invalid login credentials. Please check your email & password."));
  }
});

export const registerUser = createAsyncThunk("auth/register", async (form, { rejectWithValue }) => {
  try {
    const result = await authApi.register(form);
    if (result.session) applySession(result.session);
    return result;
  } catch (error) {
    return rejectWithValue(toRejection(error, "Registration failed. Please try again."));
  }
});

/**
 * Finishes Google (or email-link) sign-in. A brand-new Google account without
 * a role is rejected with `details.needsRole` so the UI can ask for one.
 */
export const completeOAuth = createAsyncThunk(
  "auth/completeOAuth",
  async ({ accessToken, refreshToken, role }, { rejectWithValue }) => {
    try {
      const result = await authApi.completeOAuth({ accessToken, refreshToken, role });
      if (result.session) applySession(result.session);
      return result;
    } catch (error) {
      return rejectWithValue(toRejection(error, "Google sign-in could not be completed."));
    }
  }
);

export const refreshCurrentUser = createAsyncThunk("auth/refreshUser", async (_, { rejectWithValue }) => {
  try {
    const result = await authApi.me();
    return result.user;
  } catch (error) {
    return rejectWithValue(toRejection(error));
  }
});

/** Signs out every device (revokes all refresh tokens server-side). */
export const logoutAllDevices = createAsyncThunk("auth/logoutAll", async () => {
  try {
    await authApi.logoutAll();
  } catch {
    /* cleared locally regardless */
  }
  clearSession();
  broadcastLogout();
});

export const logoutUser = createAsyncThunk("auth/logout", async () => {
  try {
    await authApi.logout();
  } catch {
    // The server may be unreachable; the local session is cleared regardless.
  }
  clearSession();
  broadcastLogout(); // sign out other open tabs too
});

const initialState = {
  user: null,
  // "checking" until /auth/refresh tells us whether the refresh cookie holds a session.
  status: "checking",
  isSubmitting: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    /** Replaces the user after a profile update or upload returns the fresh record. */
    setUser(state, action) {
      state.user = action.payload;
    },
    mergeUser(state, action) {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
    sessionExpired(state) {
      state.user = null;
      state.status = "ready";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapSession.fulfilled, (state, action) => {
        state.user = action.payload.user || null;
        state.status = "ready";
      })
      .addCase(bootstrapSession.rejected, (state) => {
        state.user = null;
        state.status = "ready";
      })
      .addCase(refreshCurrentUser.fulfilled, (state, action) => {
        if (action.payload) state.user = action.payload;
      })
      .addCase(logoutAllDevices.fulfilled, (state) => {
        state.user = null;
        state.isSubmitting = false;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isSubmitting = false;
      });

    // Shared pending/settled handling for the form-driven auth thunks.
    [loginUser, registerUser, completeOAuth].forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.isSubmitting = true;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          state.isSubmitting = false;
          if (action.payload?.user) state.user = action.payload.user;
          state.status = "ready";
        })
        .addCase(thunk.rejected, (state) => {
          state.isSubmitting = false;
        });
    });
  },
});

export const { setUser, mergeUser, sessionExpired } = authSlice.actions;

export const selectCurrentUser = (state) => state.auth.user;
export const selectAuthReady = (state) => state.auth.status === "ready";
export const selectIsSubmitting = (state) => state.auth.isSubmitting;
export const selectUserRole = (state) => (state.auth.user?.role || "").toLowerCase();

export default authSlice.reducer;
