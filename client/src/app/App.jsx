import { useEffect } from "react";
import { Provider, useDispatch } from "react-redux";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router";
import { Toaster } from "react-hot-toast";
import { store } from "./store";
import { queryClient } from "./queryClient";
import AppRoutes from "./AppRoutes";
import ErrorBoundary from "@/shared/components/ErrorBoundary";
import { ConfirmProvider } from "@/shared/components/ConfirmDialog";
import { bootstrapSession } from "@/features/auth/store/authSlice";

function SessionBootstrap() {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(bootstrapSession());
  }, [dispatch]);
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
