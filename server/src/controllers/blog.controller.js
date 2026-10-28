import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { pick } from "../utils/object.js";
import { slugify } from "../utils/normalize.js";
import { anonDb } from "../config/supabase.js";
import { BlogModel, CONTENT_TYPES } from "../models/blog.model.js";

const EDITABLE = [
  "title",
  "slug",
  "content_type",
  "excerpt",
  "content",
  "cover_image_url",
  "category",
  "tags",
  "author_name",
  "status",
  "featured",
  "reading_time_minutes",
  "seo_title",
  "seo_description",
  "canonical_url",
  "og_image_url",
  "scheduled_at",
];

const estimateReadingTime = (content = "") => Math.max(1, Math.round(String(content).split(/\s+/).length / 200));

const preparePayload = (body, { isCreate }) => {
  const payload = pick(body, EDITABLE);
  if (payload.content_type && !CONTENT_TYPES.includes(payload.content_type)) {
    throw ApiError.badRequest("Invalid content stream.");
  }
  if (isCreate || payload.slug !== undefined) {
    payload.slug = slugify(payload.slug || payload.title);
    if (!payload.slug) throw ApiError.badRequest("Please enter an article title.");
  }
  if (payload.content !== undefined) payload.reading_time_minutes = estimateReadingTime(payload.content);
  if (payload.status === "published" && !body.published_at) payload.published_at = new Date().toISOString();
  return payload;
};

export const BlogController = {
  /** Public list: published posts only. */
  listPublished: asyncHandler(async (req, res) => {
    const posts = await BlogModel.list(anonDb, {
      contentType: req.query.type,
      search: req.query.search,
      category: req.query.category,
      featured: req.query.featured,
      limit: req.query.limit,
      status: "published",
    });
    res.json({ success: true, data: posts });
  }),

  getBySlug: asyncHandler(async (req, res) => {
    const db = req.user?.role === "admin" ? req.db : anonDb;
    const post = await BlogModel.findBySlug(db, req.params.slug);
    if (!post) throw ApiError.notFound("The article you requested is no longer available or was moved.");
    res.json({ success: true, data: post });
  }),

  recordView: asyncHandler(async (req, res) => {
    await BlogModel.incrementViews(anonDb, req.params.slug);
    res.json({ success: true });
  }),

  // ---- Admin ----
  listAll: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await BlogModel.list(req.db, { contentType: req.query.type, search: req.query.search }) });
  }),

  create: asyncHandler(async (req, res) => {
    if (!req.body.title || !req.body.content) throw ApiError.badRequest("Please enter title and content.");
    const payload = preparePayload(req.body, { isCreate: true });
    const post = await BlogModel.create(req.db, {
      ...payload,
      author_id: req.user.id,
      author_name: payload.author_name || req.user.name || "EduHire Editorial",
      status: payload.status || "published",
      published_at: payload.status === "draft" ? null : payload.published_at || new Date().toISOString(),
    });
    res.status(201).json({ success: true, data: post });
  }),

  update: asyncHandler(async (req, res) => {
    const post = await BlogModel.update(req.db, req.params.id, preparePayload(req.body, { isCreate: false }));
    if (!post) throw ApiError.notFound("Article not found.");
    res.json({ success: true, data: post });
  }),

  remove: asyncHandler(async (req, res) => {
    await BlogModel.remove(req.db, req.params.id);
    res.json({ success: true, message: "Article deleted." });
  }),
};
