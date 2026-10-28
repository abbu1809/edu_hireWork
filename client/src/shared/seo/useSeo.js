import { useEffect } from "react";
import { useLocation } from "react-router";

export const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://eduhirebridge.in").replace(/\/$/, "");
export const SITE_NAME = "EduHire Bridge";
const DEFAULT_DESCRIPTION =
  "Post verified coaching and school faculty vacancies, or apply as a KYC-checked JEE/NEET educator. Demo lectures, shortlists, and direct offers — built for Indian institutes.";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

const upsertMeta = (attr, key, content) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!content) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
};

const upsertLink = (rel, href) => {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
};

const JSON_LD_ID = "route-jsonld";

const setJsonLd = (data) => {
  document.getElementById(JSON_LD_ID)?.remove();
  const items = (Array.isArray(data) ? data : [data]).filter(Boolean);
  if (!items.length) return;
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = JSON_LD_ID;
  script.textContent = JSON.stringify(items.length === 1 ? items[0] : { "@context": "https://schema.org", "@graph": items });
  document.head.appendChild(script);
};

const truncate = (text = "", max = 160) => {
  const clean = String(text).replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
};

/**
 * Per-route SEO: title, description, canonical URL, Open Graph / Twitter tags,
 * robots directive and JSON-LD structured data (for search engines and answer
 * engines). Private pages pass `noindex: true`.
 */
export const useSeo = ({ title, description, path, image, type = "website", noindex = false, jsonLd } = {}) => {
  const location = useLocation();
  const canonicalPath = path ?? location.pathname;
  const jsonKey = jsonLd ? JSON.stringify(jsonLd) : "";

  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | JEE, NEET & School Faculty Hiring`;
    const desc = truncate(description || DEFAULT_DESCRIPTION);
    const url = `${SITE_URL}${canonicalPath === "/" ? "/" : canonicalPath}`;
    const img = image || DEFAULT_IMAGE;

    document.title = fullTitle;
    upsertMeta("name", "description", desc);
    upsertMeta("name", "robots", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large");
    upsertLink("canonical", url);

    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", desc);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", img);
    upsertMeta("property", "og:locale", "en_IN");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", desc);
    upsertMeta("name", "twitter:image", img);

    setJsonLd(noindex ? null : jsonLd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, canonicalPath, image, type, noindex, jsonKey]);
};
