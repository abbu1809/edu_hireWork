import { useCallback, useEffect, useRef } from "react";

/**
 * Returns a version of `fn` that runs at most once per `wait` ms (leading edge).
 * Used on action buttons (apply, unlock, retry, copy) so rapid clicks cannot
 * fire duplicate API calls before React re-renders the disabled state.
 */
export const useThrottledCallback = (fn, wait = 800) => {
  const lastRun = useRef(0);
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  return useCallback(
    (...args) => {
      const now = Date.now();
      if (now - lastRun.current < wait) return undefined;
      lastRun.current = now;
      return fnRef.current(...args);
    },
    [wait]
  );
};
