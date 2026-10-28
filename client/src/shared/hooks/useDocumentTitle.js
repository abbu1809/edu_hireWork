import { useSeo } from "@/shared/seo/useSeo";

/** Title for private pages (portals, auth, notifications) — kept out of search indexes. */
export const useDocumentTitle = (title) => useSeo({ title, noindex: true });
