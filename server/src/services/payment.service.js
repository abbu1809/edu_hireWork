import crypto from "crypto";
import { config, isRazorpayConfigured } from "../config/env.js";
import { razorpay } from "../config/razorpay.js";
import { serviceDb } from "../config/supabase.js";
import { ApiError } from "../utils/ApiError.js";
import { PaymentModel } from "../models/payment.model.js";
import { InstituteModel } from "../models/institute.model.js";
import { TeacherModel } from "../models/teacher.model.js";
import { NotificationService } from "./notification.service.js";
import { EmailService } from "./email/email.service.js";

const PURPOSE_UNLOCK = "TEACHER_UNLOCK";

const ensureConfigured = () => {
  if (!isRazorpayConfigured() || !razorpay) {
    throw ApiError.unavailable("Online payments are not configured yet. Please contact support.");
  }
};

const safeEqual = (a, b) => {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

/** Applies what a captured payment pays for. Safe to call more than once. */
const fulfil = async (payment) => {
  if (payment?.purpose_type === PURPOSE_UNLOCK && payment.target_id && payment.payer_id) {
    await InstituteModel.addUnlockedTeacher(serviceDb, payment.payer_id, payment.target_id);
    await NotificationService.notify({
      userId: payment.payer_id,
      title: "Contact unlocked",
      message: `${payment.purpose} — payment of ₹${payment.amount} received.`,
      type: "PAYMENT",
      link: "/institute/unlocked",
    });
    // Sent once per capture: fulfil() runs again on webhook retries, so key on the first call.
    if (!receiptSent.has(payment.order_id)) {
      receiptSent.add(payment.order_id);
      EmailService.background(
        EmailService.sendToUser(
          payment.payer_id,
          "paymentReceipt",
          {
            amount: payment.amount,
            purpose: payment.purpose,
            paymentId: payment.payment_id,
            orderId: payment.order_id,
            method: payment.method,
            date: new Date(payment.captured_at || Date.now()).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }),
          },
          { preference: null }
        )
      );
    }
  }
};

const receiptSent = new Set();

export const PaymentService = {
  getPublicConfig() {
    return {
      enabled: isRazorpayConfigured(),
      keyId: isRazorpayConfigured() ? config.razorpay.keyId : null,
      currency: "INR",
      unlockFee: config.pricing.instituteUnlockFee,
    };
  },

  /** Creates a Razorpay order for unlocking one teacher's contact details. */
  async createUnlockOrder({ db, institute, teacherId }) {
    ensureConfigured();

    const teacher = await TeacherModel.findPublicById(serviceDb, teacherId);
    if (!teacher) throw ApiError.notFound("Teacher profile not found.");

    const unlocked = await InstituteModel.getUnlockedIds(serviceDb, institute.id);
    if (unlocked.includes(teacherId)) throw ApiError.conflict("You have already unlocked this teacher.");

    const amount = config.pricing.instituteUnlockFee;
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: "INR",
      receipt: `unlock_${Date.now()}`,
      notes: { purpose_type: PURPOSE_UNLOCK, institute_id: institute.id, teacher_id: teacherId },
    });

    const purpose = `Unlock Contact & Resume: ${teacher.name}`;
    // Inserted as the institute so the "payer can create CREATED order" RLS rule applies.
    await PaymentModel.create(db, {
      id: order.id,
      order_id: order.id,
      payer_id: institute.id,
      payer_name: institute.name,
      purpose,
      purpose_type: PURPOSE_UNLOCK,
      target_id: teacherId,
      amount,
      currency: "INR",
      status: "CREATED",
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: config.razorpay.keyId,
      purpose,
      teacherName: teacher.name,
    };
  },

  /** Verifies the checkout signature, captures the payment and unlocks the teacher. */
  async verifyCheckout({ payerId, orderId, paymentId, signature }) {
    ensureConfigured();

    const expected = crypto
      .createHmac("sha256", config.razorpay.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    if (!safeEqual(expected, signature)) {
      await PaymentModel.markFailed(serviceDb, orderId);
      throw ApiError.badRequest("Payment verification failed. If money was deducted, contact support.");
    }

    const existing = await PaymentModel.findByOrderId(serviceDb, orderId);
    if (!existing || existing.payer_id !== payerId) throw ApiError.notFound("Payment order not found.");

    let method = "Razorpay";
    try {
      const details = await razorpay.payments.fetch(paymentId);
      if (details?.method) method = `Razorpay ${String(details.method).toUpperCase()}`;
    } catch {
      // Method is informational only.
    }

    const payment =
      existing.status === "CAPTURED"
        ? existing
        : await PaymentModel.markCaptured(serviceDb, orderId, { paymentId, signature, method });
    await fulfil(payment);
    return payment;
  },

  /** Razorpay webhook: confirms captures even when the browser closed early. */
  async handleWebhook(rawBody, signatureHeader) {
    if (!config.razorpay.webhookSecret) throw ApiError.unavailable("Webhook secret not configured.");
    const expected = crypto.createHmac("sha256", config.razorpay.webhookSecret).update(rawBody).digest("hex");
    if (!safeEqual(expected, signatureHeader)) throw ApiError.badRequest("Invalid webhook signature.");

    const event = JSON.parse(rawBody.toString("utf8"));
    const entity = event?.payload?.payment?.entity;
    if (!entity?.order_id) return { ignored: true };

    if (event.event === "payment.captured" || event.event === "order.paid") {
      const existing = await PaymentModel.findByOrderId(serviceDb, entity.order_id);
      if (!existing) return { ignored: true };
      const payment =
        existing.status === "CAPTURED"
          ? existing
          : await PaymentModel.markCaptured(serviceDb, entity.order_id, {
              paymentId: entity.id,
              method: entity.method ? `Razorpay ${String(entity.method).toUpperCase()}` : "Razorpay",
            });
      await fulfil(payment);
    } else if (event.event === "payment.failed") {
      await PaymentModel.markFailed(serviceDb, entity.order_id);
    }
    return { received: true };
  },
};
