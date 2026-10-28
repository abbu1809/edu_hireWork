import { createBaseModel } from "./baseModel.js";
import { unwrap } from "../utils/ApiError.js";
import { escapeFilter } from "../utils/normalize.js";

const base = createBaseModel("blog_posts");

export const CONTENT_TYPES = ["TEACHER_UPDATE", "INSTITUTE_UPDATE", "BLOG"];

export const BlogModel = {
  ...base,

  async update(db, id, updates) {
    return base.update(db, id, { ...updates, updated_at: new Date().toISOString() });
  },

  async list(db, filters = {}) {
    let query = db.from("blog_posts").select("*");
    const search = escapeFilter(filters.search);

    if (filters.contentType && filters.contentType !== "ALL") query = query.eq("content_type", filters.contentType);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.category) query = query.eq("category", filters.category);
    if (filters.featured === true || filters.featured === "true") query = query.eq("featured", true);
    if (search) query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%,category.ilike.%${search}%`);

    const limit = Number(filters.limit) || 200;
    return unwrap(await query.order("created_at", { ascending: false }).limit(limit)) || [];
  },

  async findBySlug(db, slug) {
    return unwrap(await db.from("blog_posts").select("*").eq("slug", slug).maybeSingle());
  },

  async incrementViews(db, slug) {
    await db.rpc("increment_article_views", { article_slug: slug });
  },
};
