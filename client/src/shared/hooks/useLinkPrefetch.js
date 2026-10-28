import { useEffect } from "react";
import { preloadRoute } from "@/shared/utils/lazyWithPreload";

/**
 * One delegated listener for the whole app: when the pointer rests on, or
 * keyboard focus reaches, an internal link, its page chunk starts downloading
 * so the click feels instant. Each chunk is fetched at most once.
 */
export const useLinkPrefetch = () => {
  useEffect(() => {
    const seen = new Set();
    const handler = (event) => {
      const anchor = event.target?.closest?.("a[href]");
      if (!anchor || anchor.origin !== window.location.origin) return;
      const path = anchor.pathname;
      if (seen.has(path)) return;
      seen.add(path);
      preloadRoute(path);
    };
    document.addEventListener("mouseover", handler, { passive: true });
    document.addEventListener("focusin", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mouseover", handler);
      document.removeEventListener("focusin", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, []);
};
