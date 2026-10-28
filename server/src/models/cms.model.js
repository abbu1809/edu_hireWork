import { createBaseModel } from "./baseModel.js";
import { unwrap } from "../utils/ApiError.js";

const stamp = (updates) => ({ ...updates, updated_at: new Date().toISOString() });

const formFieldBase = createBaseModel("form_fields", { orderBy: "sort_order", ascending: true });
export const FormFieldModel = {
  ...formFieldBase,
  update: (db, id, updates) => formFieldBase.update(db, id, stamp(updates)),
  async listByType(db, formType) {
    let query = db.from("form_fields").select("*").order("sort_order", { ascending: true });
    if (formType) query = query.eq("form_type", formType.toUpperCase());
    return unwrap(await query) || [];
  },
};

const paymentLinkBase = createBaseModel("payment_links", { orderBy: "sort_order", ascending: true });
export const PaymentLinkModel = {
  ...paymentLinkBase,
  update: (db, id, updates) => paymentLinkBase.update(db, id, stamp(updates)),
  async listActive(db) {
    return (
      unwrap(await db.from("payment_links").select("*").eq("active", true).order("sort_order", { ascending: true })) || []
    );
  },
};

export const SettingModel = {
  async getMap(db) {
    const rows = unwrap(await db.from("platform_settings").select("key, value")) || [];
    return rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  },

  async upsert(db, key, value, description = "") {
    return unwrap(
      await db
        .from("platform_settings")
        .upsert({ key, value, description, updated_at: new Date().toISOString() })
        .select()
        .single()
    );
  },
};

export const AuditLogModel = {
  async list(db, { entityType, entityId, limit = 200 } = {}) {
    let query = db.from("verification_audit_logs").select("*").order("created_at", { ascending: false }).limit(limit);
    if (entityType) query = query.eq("entity_type", entityType);
    if (entityId) query = query.eq("entity_id", entityId);
    return unwrap(await query) || [];
  },
};

export const InquiryModel = {
  ...createBaseModel("contact_inquiries"),
};

export const AdminActionModel = {
  async log(db, { adminId, actionType, targetId, targetType, details = {} }) {
    await db
      .from("admin_actions")
      .insert([{ admin_id: adminId, action_type: actionType, target_id: String(targetId), target_type: targetType, details }]);
  },
};
