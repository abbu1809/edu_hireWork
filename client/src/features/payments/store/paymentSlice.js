import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { paymentsApi, loadRazorpayCheckout } from "../api/payments.api";
import { getErrorMessage } from "@/shared/api/httpClient";

const DISMISSED = "DISMISSED";

/**
 * Real Razorpay flow: the server creates the order, Razorpay Checkout collects
 * the payment, and the server verifies the signature before unlocking.
 */
export const payForTeacherUnlock = createAsyncThunk(
  "payments/unlockTeacher",
  async ({ teacherId, customer }, { rejectWithValue }) => {
    try {
      const [order, Razorpay] = await Promise.all([paymentsApi.createUnlockOrder(teacherId), loadRazorpayCheckout()]);

      const response = await new Promise((resolve, reject) => {
        const checkout = new Razorpay({
          key: order.keyId,
          order_id: order.orderId,
          amount: order.amount,
          currency: order.currency,
          name: "EduHire Bridge",
          description: order.purpose,
          prefill: { name: customer?.name || "", email: customer?.email || "", contact: customer?.phone || "" },
          theme: { color: "#00754A" },
          handler: resolve,
          modal: { ondismiss: () => reject(new Error(DISMISSED)) },
        });
        checkout.on("payment.failed", (event) =>
          reject(new Error(event?.error?.description || "Payment failed. No money was taken."))
        );
        checkout.open();
      });

      const payment = await paymentsApi.verify({
        orderId: response.razorpay_order_id,
        paymentId: response.razorpay_payment_id,
        signature: response.razorpay_signature,
      });
      return { payment, teacherName: order.teacherName, amount: order.amount / 100 };
    } catch (error) {
      if (error?.message === DISMISSED) return rejectWithValue({ dismissed: true });
      return rejectWithValue({ message: getErrorMessage(error, "Payment could not be completed.") });
    }
  }
);

const paymentSlice = createSlice({
  name: "payments",
  initialState: {
    // { teacherId, teacherName } while the confirmation modal is open.
    checkout: null,
    processing: false,
  },
  reducers: {
    openCheckout(state, action) {
      state.checkout = action.payload;
    },
    closeCheckout(state) {
      if (!state.processing) state.checkout = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(payForTeacherUnlock.pending, (state) => {
        state.processing = true;
      })
      .addCase(payForTeacherUnlock.fulfilled, (state) => {
        state.processing = false;
        state.checkout = null;
      })
      .addCase(payForTeacherUnlock.rejected, (state) => {
        state.processing = false;
      });
  },
});

export const { openCheckout, closeCheckout } = paymentSlice.actions;
export const selectCheckout = (state) => state.payments.checkout;
export const selectPaymentProcessing = (state) => state.payments.processing;

export default paymentSlice.reducer;
