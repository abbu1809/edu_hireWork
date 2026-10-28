import { http, unwrap } from "@/shared/api/httpClient";

export const paymentsApi = {
  config: () => unwrap(http.get("/payments/config")),
  createUnlockOrder: (teacherId) => unwrap(http.post("/payments/unlock-order", { teacherId })),
  verify: ({ orderId, paymentId, signature }) => unwrap(http.post("/payments/verify", { orderId, paymentId, signature })),
  listMine: () => unwrap(http.get("/payments/mine")),
};

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let checkoutScript = null;

/** Loads Razorpay Checkout once. */
export const loadRazorpayCheckout = () => {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve(window.Razorpay);
  if (!checkoutScript) {
    checkoutScript = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = CHECKOUT_SRC;
      script.async = true;
      script.onload = () => resolve(window.Razorpay);
      script.onerror = () => {
        checkoutScript = null;
        reject(new Error("Could not load Razorpay Checkout. Check your connection and try again."));
      };
      document.body.appendChild(script);
    });
  }
  return checkoutScript;
};
