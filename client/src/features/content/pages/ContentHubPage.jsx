import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ArrowRight, FileText, BookOpen, GraduationCap, School, Newspaper, LayoutGrid } from "lucide-react";
import { useBlogPosts } from "../hooks/useContent";
import { usePlatformSettings } from "@/features/site/hooks/useSite";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useSeo } from "@/shared/seo/useSeo";
import { itemListSchema } from "@/shared/seo/schema";
import { CONTENT_STREAMS, STREAM_LABELS } from "@/shared/constants/options";
import { autoGrid, formatDate } from "@/shared/utils/format";

const STREAM_PATHS = {
  TEACHER_UPDATE: "/teacher-updates",
  INSTITUTE_UPDATE: "/institute-updates",
  BLOG: "/blog",
  ALL: "/content-hub",
};

const SETTING_FOR_STREAM = {
  TEACHER_UPDATE: "teacher_updates_enabled",
  INSTITUTE_UPDATE: "institute_updates_enabled",
  BLOG: "blog_enabled",
};

const STREAM_ICONS = { GraduationCap, School, Newspaper, LayoutGrid };

const isDisabled = (value) => value === false || value === "false";

/**
 * Knowledge base. The stream comes from the route: /teacher-updates,
 * /institute-updates, /blog, /content-hub (all) or /content-hub/:stream.
 */
export default function ContentHubPage({ stream: streamProp }) {
  const { stream: streamSlug } = useParams();
  const navigate = useNavigate();
  const { data: settings } = usePlatformSettings();
  const [searchQuery, setSearchQuery] = useState("");

  const activeStream = streamProp || CONTENT_STREAMS.find((s) => s.slug === streamSlug)?.id || "ALL";
  const tabs = CONTENT_STREAMS.filter((s) => s.id === "ALL" || !isDisabled(settings?.[SETTING_FOR_STREAM[s.id]]));
  const activeLabel = CONTENT_STREAMS.find((s) => s.id === activeStream)?.label;

  const search = useDebouncedValue(searchQuery.trim());
  const query = useBlogPosts({ type: activeStream, search });
  const posts = query.data || [];

  useSeo({
    title: activeStream === "ALL" ? "Content Hub — Teaching Career Guides & Hiring Trends" : `${activeLabel} — Articles & Guides`,
    description:
      "Career guides for teachers, recruiter playbooks for coaching institutes, faculty salary trends and JEE/NEET hiring insights from EduHire Bridge.",
    jsonLd: posts.length ? itemListSchema("Articles", posts.map((p) => ({ name: p.title, path: `/blog/${p.slug}` }))) : null,
  });

  return (
    <div className="page-container">
      {/* Top Banner Header */}
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <div className="badge badge-gold" style={{ marginBottom: "0.75rem" }}>
          <BookOpen size={13} aria-hidden="true" /> EduHire Knowledge Base & Community
        </div>
        <h1 className="serif-headline" style={{ fontSize: "2.4rem", color: "var(--color-brand-house)", marginBottom: "0.75rem" }}>
          Articles, Career Guides & Hiring Trends
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", maxWidth: "650px", margin: "0 auto" }}>
          Pedagogical playbooks, interview masterclasses, syllabus updates, and faculty compensation insights.
        </p>
      </div>

      {/* Stream Tabs & Search Filter */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--color-canvas-ceramic)",
          paddingBottom: "1.25rem",
          marginBottom: "2.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }} role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeStream === tab.id}
              className={`btn ${activeStream === tab.id ? "btn-primary" : "btn-dark-outline"}`}
              style={{ padding: "6px 16px", fontSize: "0.88rem" }}
              onClick={() => navigate(STREAM_PATHS[tab.id])}
            >
              {STREAM_ICONS[tab.icon] && (() => {
                const TabIcon = STREAM_ICONS[tab.icon];
                return <TabIcon size={15} aria-hidden="true" />;
              })()}
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ minWidth: "min(260px, 100%)", flex: "0 1 260px" }}>
          <input
            type="search"
            className="input-field"
            placeholder="Search articles..."
            aria-label="Search articles"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <QueryState query={query} loadingLabel="Loading articles...">
        {posts.length === 0 ? (
          <EmptyState icon={FileText} title="No Articles Found in This Category">
            Check back shortly as our editorial team and academic advisors publish new hiring analysis and guides.
          </EmptyState>
        ) : (
          <div style={autoGrid("360px", "2rem")}>
            {posts.map((post) => (
              <div key={post.id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  {post.cover_image_url && (
                    <img
                      src={post.cover_image_url}
                      alt=""
                      loading="lazy"
                      style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "8px", marginBottom: "1rem" }}
                    />
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", gap: "0.5rem" }}>
                    <span className="badge badge-role">{post.category || STREAM_LABELS[post.content_type] || "Guide"}</span>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>{formatDate(post.published_at || post.created_at)}</span>
                  </div>

                  <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--color-brand-house)", marginBottom: "0.75rem", lineHeight: "1.35" }}>
                    <Link to={`/blog/${post.slug}`} style={{ color: "inherit" }}>
                      {post.title}
                    </Link>
                  </h3>

                  <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.6", marginBottom: "1.5rem" }}>
                    {post.excerpt || (post.content ? `${post.content.substring(0, 140)}...` : "")}
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid var(--color-canvas-ceramic)",
                    paddingTop: "1rem",
                    gap: "0.5rem",
                  }}
                >
                  <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    By {post.author_name || "EduHire Editorial"}
                    {post.reading_time_minutes ? ` · ${post.reading_time_minutes} min read` : ""}
                  </span>
                  <Link to={`/blog/${post.slug}`} className="btn btn-outline btn-sm">
                    Read Article <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
