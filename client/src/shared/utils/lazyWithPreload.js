import { lazy } from "react";

/** React.lazy plus a `.preload()` to fetch the chunk early (e.g. when a link is hovered). */
export const lazyWithPreload = (factory) => {
  let promise = null;
  const load = () => {
    promise = promise || factory();
    return promise;
  };
  const Component = lazy(load);
  Component.preload = load;
  return Component;
};

// path -> preload functions (a portal path needs its layout and its index page), filled in by AppRoutes.
const registry = new Map();

export const registerPreload = (path, Component) => {
  registry.set(path, [...(registry.get(path) || []), Component.preload]);
};

/** Starts downloading the page chunk(s) for `path` (no-op if unknown or already loaded). */
export const preloadRoute = (path) => {
  const clean = String(path || "").split(/[?#]/)[0].replace(/\/$/, "") || "/";
  // Exact match first, then the closest registered parent (e.g. /careers/123 -> /careers).
  let target = clean;
  while (target && !registry.has(target)) target = target.slice(0, target.lastIndexOf("/"));
  (registry.get(target) || []).forEach((preload) => preload().catch(() => {}));
};
