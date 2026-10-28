import { unwrap } from "../utils/ApiError.js";

export const BUCKETS = { AVATARS: "avatars", RESUMES: "resumes", DOCUMENTS: "documents" };

/** Picks the storage bucket for a document type. */
export const bucketForDocumentType = (documentType) => {
  if (documentType === "RESUME") return BUCKETS.RESUMES;
  if (documentType === "PHOTO" || documentType === "AVATAR") return BUCKETS.AVATARS;
  return BUCKETS.DOCUMENTS;
};

/** Normalises any bucket reference to one of the 3 canonical buckets. */
export const normalizeBucketName = (bucket = "documents") => {
  const b = String(bucket || "").trim().toLowerCase();
  if (b.startsWith("avatar") || b.includes("photo") || b.includes("profile")) return BUCKETS.AVATARS;
  if (b.startsWith("resume") || b.includes("cv")) return BUCKETS.RESUMES;
  return BUCKETS.DOCUMENTS;
};

/**
 * Extracts the object path from a stored value, which may be a raw path,
 * a legacy public URL or a signed URL.
 */
export const extractStoragePath = (urlOrPath) => {
  if (!urlOrPath || typeof urlOrPath !== "string") return "";
  const trimmed = urlOrPath.trim();
  const match = trimmed.match(/\/storage\/v1\/object\/(?:public\/|sign\/|authenticated\/)?([^/?#]+)\/([^?#]+)/i);
  if (match && match[2]) return decodeURIComponent(match[2]);

  const prefixes = ["resumes/", "resume/", "documents/", "document/", "avatars/", "avatar/"];
  const lower = trimmed.toLowerCase();
  for (const prefix of prefixes) {
    if (lower.startsWith(prefix)) return trimmed.slice(prefix.length).replace(/^\/+/, "");
  }
  return trimmed.split("?")[0].replace(/^\/+/, "");
};

export const StorageService = {
  /** Uploads a file buffer into `<userId>/...` so storage RLS ownership checks pass. */
  async upload(db, { bucket, userId, documentType, file }) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const path = `${userId}/${String(documentType || "file").toLowerCase()}_${Date.now()}_${safeName}`;

    unwrap(
      await db.storage.from(bucket).upload(path, file.buffer, { contentType: file.mimetype, upsert: true }),
      "File upload failed."
    );

    const publicUrl = bucket === BUCKETS.AVATARS ? db.storage.from(bucket).getPublicUrl(path).data?.publicUrl : null;
    return { bucket, path, publicUrl };
  },

  /** Returns a URL the browser can open: public for avatars, 1-hour signed URL otherwise. */
  async resolveUrl(db, bucket, stored, expiresIn = 3600) {
    if (!stored) return "";
    const target = normalizeBucketName(bucket);
    const path = extractStoragePath(stored);
    if (!path) return "";

    if (target === BUCKETS.AVATARS) {
      return db.storage.from(target).getPublicUrl(path).data?.publicUrl || "";
    }
    const { data, error } = await db.storage.from(target).createSignedUrl(path, expiresIn);
    if (error) return "";
    return data?.signedUrl || "";
  },

  async remove(db, bucket, stored) {
    const path = extractStoragePath(stored);
    if (!path) return;
    await db.storage.from(normalizeBucketName(bucket)).remove([path]);
  },
};
