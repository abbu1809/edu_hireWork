import { useState } from "react";
import { Link } from "react-router";
import { FileText, Plus, Trash2, ExternalLink } from "lucide-react";
import { useAdminBlog, useCreatePost, useDeletePost } from "../hooks/useAdmin";
import { DashboardHeader } from "@/shared/components/layout/DashboardLayout";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import Modal from "@/shared/components/Modal";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { notify } from "@/shared/utils/notify";
import { useConfirm } from "@/shared/components/ConfirmDialog";
import { autoGrid, formatDate } from "@/shared/utils/format";
import { STREAM_LABELS } from "@/shared/constants/options";

const EMPTY_POST = { title: "", content_type: "TEACHER_UPDATE", category: "", excerpt: "", content: "", cover_image_url: "", status: "published" };

function ArticleModal({ onClose }) {
  const create = useCreatePost();
  const [form, setForm] = useState(EMPTY_POST);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return notify.error("Please enter title and content.");
    create.mutate(
      { ...form, category: form.category.trim() || STREAM_LABELS[form.content_type] },
      {
        onSuccess: () => {
          notify.success(form.status === "draft" ? "Draft saved." : "Article published to Content Hub!");
          onClose();
        },
        onError: (error) => notify.apiError(error, "Failed to create article."),
      }
    );
  };

  return (
    <Modal title="Write New Article" onClose={onClose} maxWidth="680px">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="ar-title">
            Title
          </label>
          <input
            id="ar-title"
            type="text"
            className="input-field"
            placeholder="e.g. 2026 Kota Faculty Salary Trends & JEE Hiring Guide"
            value={form.title}
            onChange={set("title")}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <div className="form-group">
            <label className="form-label" htmlFor="ar-stream">
              Category Stream
            </label>
            <select id="ar-stream" className="input-select" style={{ width: "100%" }} value={form.content_type} onChange={set("content_type")}>
              <option value="TEACHER_UPDATE">Teacher Updates (Learn & Grow)</option>
              <option value="INSTITUTE_UPDATE">Institute Recruiter Hub</option>
              <option value="BLOG">General Educational Blog</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="ar-category">
              Topic Label (optional)
            </label>
            <input id="ar-category" type="text" className="input-field" placeholder="e.g. Salary Trends" value={form.category} onChange={set("category")} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="ar-excerpt">
            Short Summary (Excerpt)
          </label>
          <input id="ar-excerpt" type="text" className="input-field" placeholder="1-2 sentences summarizing the article" value={form.excerpt} onChange={set("excerpt")} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="ar-cover">
            Cover Image URL (optional)
          </label>
          <input id="ar-cover" type="url" className="input-field" placeholder="https://..." value={form.cover_image_url} onChange={set("cover_image_url")} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="ar-content">
            Full Article Content
          </label>
          <textarea id="ar-content" className="input-field" rows={8} placeholder="Write complete article..." value={form.content} onChange={set("content")} required />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" style={{ marginTop: "1rem" }}>
          <button type="submit" className="btn btn-outline" disabled={create.isPending} onClick={() => setForm((f) => ({ ...f, status: "draft" }))}>
            Save as Draft
          </button>
          <button type="submit" className="btn btn-primary" disabled={create.isPending} onClick={() => setForm((f) => ({ ...f, status: "published" }))}>
            {create.isPending ? "Publishing..." : "Publish Article Live"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminContentPage() {
  useDocumentTitle("Content Hub CMS");
  const query = useAdminBlog();
  const remove = useDeletePost();
  const [showModal, setShowModal] = useState(false);
  const confirm = useConfirm();
  const posts = query.data || [];

  const handleDelete = async (post) => {
    const ok = await confirm({
      title: "Delete article?",
      message: `"${post.title}" will be removed from the Content Hub permanently. This cannot be undone.`,
      confirmLabel: "Delete article",
      tone: "danger",
    });
    if (!ok) return;
    remove.mutate(post.id, {
      onSuccess: () => notify.info("Article deleted."),
      onError: (error) => notify.apiError(error, "Failed to delete article."),
    });
  };

  return (
    <div>
      <DashboardHeader
        title="Content Hub CMS"
        subtitle="Publish blogs, teacher salary trends, and recruiter guides"
        actions={
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Article
          </button>
        }
      />

      <QueryState query={query} loadingLabel="Loading articles...">
        {posts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No Articles Published"
            action={
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                Write First Article
              </button>
            }
          >
            Create educational blogs and career updates to engage educators and institute leaders.
          </EmptyState>
        ) : (
          <div style={autoGrid("320px")}>
            {posts.map((post) => (
              <div key={post.id} className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                    <span className="badge badge-role">{STREAM_LABELS[post.content_type] || post.category}</span>
                    <span className={`badge ${post.status === "published" ? "badge-verified" : "badge-pending"}`}>{post.status}</span>
                  </div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "700", marginBottom: "0.5rem" }}>{post.title}</h3>
                  {post.excerpt && <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>{post.excerpt}</p>}
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
                    {formatDate(post.published_at || post.created_at)} · {post.views ?? 0} views
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                  <Link to={`/blog/${post.slug}`} className="btn btn-outline btn-sm">
                    <ExternalLink size={14} /> Preview
                  </Link>
                  <button className="btn btn-danger-outline btn-sm" onClick={() => handleDelete(post)} disabled={remove.isPending && remove.variables === post.id}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </QueryState>

      {showModal && <ArticleModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
