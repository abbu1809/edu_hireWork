import { createBaseModel } from "./baseModel.js";
import { unwrap } from "../utils/ApiError.js";

const base = createBaseModel("documents");

export const DOCUMENT_TYPES = ["RESUME", "CERTIFICATE", "KYC", "PHOTO", "EXPERIENCE_LETTER", "PORTFOLIO"];

export const DocumentModel = {
  ...base,

  async listByUser(db, userId) {
    return (
      unwrap(await db.from("documents").select("*").eq("user_id", userId).order("created_at", { ascending: false })) || []
    );
  },
};
