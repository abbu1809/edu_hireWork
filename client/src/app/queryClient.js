import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        // Do not retry auth, permission or not-found errors.
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});
