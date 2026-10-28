import { unwrap } from "../utils/ApiError.js";

export const PaymentModel = {
  async create(db, row) {
    return unwrap(await db.from("payments").insert([row]).select().single());
  },

  async findByOrderId(db, orderId) {
    return unwrap(await db.from("payments").select("*").eq("order_id", orderId).maybeSingle());
  },

  async markCaptured(serviceDb, orderId, { paymentId, signature, method }) {
    return unwrap(
      await serviceDb
        .from("payments")
        .update({
          status: "CAPTURED",
          razorpay_payment_id: paymentId,
          razorpay_signature: signature || null,
          method: method || "Razorpay",
          captured_at: new Date().toISOString(),
        })
        .eq("order_id", orderId)
        .select()
        .maybeSingle()
    );
  },

  async markFailed(serviceDb, orderId) {
    unwrap(await serviceDb.from("payments").update({ status: "FAILED" }).eq("order_id", orderId).eq("status", "CREATED"));
  },

  async listByPayer(db, payerId) {
    return (
      unwrap(await db.from("payments").select("*").eq("payer_id", payerId).order("created_at", { ascending: false })) || []
    );
  },

  async listAll(db) {
    return unwrap(await db.from("payments").select("*").order("created_at", { ascending: false })) || [];
  },
};
