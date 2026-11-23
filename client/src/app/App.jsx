import { useEffect } from "react";
import { Provider, useDispatch } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, useLocation, useNavigate } from "react-router";
import { Toaster } from "react-hot-toast";
import { store } from "./store";
import { queryClient } from "./queryClient";
import AppRoutes from "./AppRoutes";
import ErrorBoundary from "@/shared/components/ErrorBoundary";
import { ConfirmProvider } from "@/shared/components/ConfirmDialog";
import { bootstrapSession } from "@/features/auth/store/authSlice";
import { readAuthHash } from "@/features/auth/components/AuthFormParts";

function SessionBootstrap() {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = readAuthHash();
    const isCallback = location.pathname.startsWith("/auth/callback");
    const isReset = location.pathname.startsWith("/auth/reset-password");

    // If OAuth/recovery tokens landed on a fallback URL (e.g. "/"), route them to the callback handler.
    if (hash.accessToken && !isCallback && !isReset) {
      if (hash.type === "recovery") {
        navigate("/auth/reset-password", { replace: true });
      } else {
        navigate(`/auth/callback${location.search}`, {
          replace: true,
          state: { accessToken: hash.accessToken, refreshToken: hash.refreshToken },
        });
      }
      return;
    }

    // On /auth/callback with OAuth tokens, let AuthCallbackPage complete OAuth without racing /auth/refresh.
    if (isCallback && (hash.accessToken || location.state?.accessToken)) {
      return;
    }

    dispatch(bootstrapSession());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <SessionBootstrap />
            <ConfirmProvider>
              <AppRoutes />
            </ConfirmProvider>
            <Toaster position="top-right" containerStyle={{ top: 24, right: 24 }} gutter={12} />
          </BrowserRouter>
        </QueryClientProvider>
      </Provider>
    </ErrorBoundary>
  );
}
