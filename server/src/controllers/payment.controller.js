import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { PaymentService } from "../services/payment.service.js";
import { PaymentModel } from "../models/payment.model.js";

export const PaymentController = {
  config: (req, res) => {
    res.json({ success: true, data: PaymentService.getPublicConfig() });
  },

  createUnlockOrder: asyncHandler(async (req, res) => {
    const { teacherId } = req.body;
    if (!teacherId) throw ApiError.badRequest("Please choose a teacher to unlock.");
    const order = await PaymentService.createUnlockOrder({
      db: req.db,
      institute: { id: req.user.id, name: req.user.name },
      teacherId,
    });
    res.status(201).json({ success: true, data: order });
  }),

  verify: asyncHandler(async (req, res) => {
    const { orderId, paymentId, signature } = req.body;
    if (!orderId || !paymentId || !signature) throw ApiError.badRequest("Incomplete payment confirmation.");
    const payment = await PaymentService.verifyCheckout({ payerId: req.user.id, orderId, paymentId, signature });
    res.json({ success: true, data: payment });
  }),

  /** Raw-body route; see routes/payment.routes.js. */
  webhook: asyncHandler(async (req, res) => {
    const result = await PaymentService.handleWebhook(req.body, req.headers["x-razorpay-signature"]);
    res.json({ success: true, data: result });
  }),

  listMine: asyncHandler(async (req, res) => {
    res.json({ success: true, data: await PaymentModel.listByPayer(req.db, req.user.id) });
  }),
};
