import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router";
import { Calendar, User, Copy, FileText, Clock } from "lucide-react";
import { useBlogPost } from "../hooks/useContent";
import { contentApi } from "../api/content.api";
import EmptyState from "@/shared/components/EmptyState";
import LoadingState from "@/shared/components/LoadingState";
import { useSeo } from "@/shared/seo/useSeo";
import { articleSchema, breadcrumbSchema } from "@/shared/seo/schema";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import { notify } from "@/shared/utils/notify";
import { formatDate } from "@/shared/utils/format";
import { STREAM_LABELS } from "@/shared/constants/options";
import { useThrottledCallback } from "@/shared/hooks/useThrottledCallback";

export default function BlogPostDetailPage() {
  const { slug } = useParams();
  const { data: article, isLoading, isError } = useBlogPost(slug);
  const viewedSlug = useRef(null);
  const crumbs = [{ name: "Home", path: "/" }, { name: "Content Hub", path: "/content-hub" }, { name: article?.title || "Article" }];
  useSeo({
    title: article?.seo_title || article?.title || "Article",
    description: article ? article.seo_description || article.excerpt || String(article.content || "").slice(0, 200) : undefined,
    path: `/blog/${slug}`,
    type: "article",
    image: article?.og_image_url || article?.cover_image_url || undefined,
    noindex: isError,
    jsonLd: article ? [articleSchema(article), breadcrumbSchema(crumbs)] : null,
  });

  // Count one view per article visit.
  useEffect(() => {
    if (article?.slug && viewedSlug.current !== article.slug) {
      viewedSlug.current = article.slug;
      contentApi.recordView(article.slug).catch(() => {});
    }
  }, [article?.slug]);

  const handleCopy = useThrottledCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify.success("Link copied to clipboard!");
    } catch {
      notify.error("Could not copy the link.");
    }
  }, 1500);

  if (isLoading) return <LoadingState label="Opening Article..." />;

  if (isError || !article) {
    return (
      <div style={{ maxWidth: "600px", margin: "5rem auto", padding: "0 1.5rem" }}>
        <EmptyState
          icon={FileText}
          title="Article Not Found"
          action={
            <Link to="/content-hub" className="btn btn-primary">
              Explore Content Hub
            </Link>
          }
        >
          The article or guide you requested is no longer available or was moved.
        </EmptyState>
      </div>
    );
  }

  return (
    <article className="page-container" style={{ maxWidth: "860px" }}>
      <Breadcrumbs items={crumbs} />

      <div style={{ marginBottom: "2rem" }}>
        <span className="badge badge-gold" style={{ marginBottom: "0.75rem" }}>
          {article.category || STREAM_LABELS[article.content_type] || "Career Guide"}
        </span>

        <h1
          className="serif-headline"
          style={{ fontSize: "clamp(1.85rem, 5vw, 2.6rem)", color: "var(--color-brand-house)", lineHeight: "1.25", marginBottom: "1.25rem" }}
        >
          {article.title}
        </h1>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--color-canvas-ceramic)",
            paddingBottom: "1.25rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.9rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <User size={16} /> {article.author_name || "EduHire Editorial"}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Calendar size={16} /> {formatDate(article.published_at || article.created_at)}
            </div>
            {article.reading_time_minutes && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Clock size={16} /> {article.reading_time_minutes} min read
              </div>
            )}
          </div>

          <button className="btn btn-outline btn-sm" onClick={handleCopy}>
            <Copy size={14} /> Copy Link
          </button>
        </div>
      </div>

      {article.cover_image_url && (
        <img src={article.cover_image_url} alt="" decoding="async" fetchpriority="high" style={{ width: "100%", borderRadius: "var(--radius-card)", marginBottom: "2rem" }} />
      )}

      {article.excerpt && (
        <div
          style={{
            fontSize: "1.15rem",
            color: "var(--text-primary)",
            fontStyle: "italic",
            lineHeight: "1.65",
            marginBottom: "2rem",
            borderLeft: "3px solid var(--color-brand-accent)",
            paddingLeft: "1.25rem",
          }}
        >
          {article.excerpt}
        </div>
      )}

      <div className="card" style={{ padding: "clamp(1.25rem, 4vw, 2.5rem) clamp(1rem, 4vw, 2rem)", lineHeight: "1.8", fontSize: "1.05rem", color: "var(--text-primary)" }}>
        <div style={{ whiteSpace: "pre-line" }}>{article.content}</div>
      </div>

      {Array.isArray(article.tags) && article.tags.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1.5rem" }}>
          {article.tags.map((tag) => (
            <span key={tag} className="badge badge-role">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
