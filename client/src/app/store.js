import { configureStore } from "@reduxjs/toolkit";
import authReducer, { sessionExpired } from "@/features/auth/store/authSlice";
import paymentReducer from "@/features/payments/store/paymentSlice";
import { setSessionExpiredHandler, setRemoteLogoutHandler } from "@/shared/api/httpClient";
import { queryClient } from "./queryClient";

// Redux holds client/session state (auth, checkout); server data lives in TanStack Query.
// configureStore includes redux-thunk, which runs every createAsyncThunk action.
export const store = configureStore({
  reducer: {
    auth: authReducer,
    payments: paymentReducer,
  },
});

setSessionExpiredHandler(() => store.dispatch(sessionExpired()));

// Logged out in another tab: drop this tab's user and cached private data.
setRemoteLogoutHandler(() => {
  store.dispatch(sessionExpired());
  queryClient.clear();
});
