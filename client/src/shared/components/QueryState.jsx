import { AlertTriangle } from "lucide-react";
import LoadingState from "./LoadingState";
import EmptyState from "./EmptyState";
import { getErrorMessage } from "@/shared/api/httpClient";
import { useThrottledCallback } from "@/shared/hooks/useThrottledCallback";

/**
 * Renders loading / error states for a TanStack query, otherwise its children.
 * Keeps every data-driven section honest: no placeholder records while loading.
 */
export default function QueryState({ query, loadingLabel = "Loading...", compact = true, children }) {
  const retry = useThrottledCallback(() => query.refetch(), 2000);
  if (query.isLoading) return <LoadingState label={loadingLabel} compact={compact} />;
  if (query.isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Could not load this section"
        action={
          <button className="btn btn-outline btn-sm" onClick={retry}>
            Try Again
          </button>
        }
      >
        {getErrorMessage(query.error)}
      </EmptyState>
    );
  }
  return children;
}
