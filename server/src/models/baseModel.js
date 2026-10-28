import { unwrap } from "../utils/ApiError.js";

/**
 * Builds the standard CRUD functions for a table. Every function receives the
 * Supabase client to use, so callers decide whether a query runs as the
 * signed-in user (RLS enforced) or with service privileges.
 */
export const createBaseModel = (table, { orderBy = "created_at", ascending = false, idColumn = "id" } = {}) => ({
  table,

  async list(db, { columns = "*" } = {}) {
    return unwrap(await db.from(table).select(columns).order(orderBy, { ascending })) || [];
  },

  async findById(db, id, { columns = "*" } = {}) {
    return unwrap(await db.from(table).select(columns).eq(idColumn, id).maybeSingle());
  },

  async create(db, row) {
    return unwrap(await db.from(table).insert([row]).select().single());
  },

  async update(db, id, updates) {
    return unwrap(await db.from(table).update(updates).eq(idColumn, id).select().maybeSingle());
  },

  async remove(db, id) {
    unwrap(await db.from(table).delete().eq(idColumn, id));
    return true;
  },
});
