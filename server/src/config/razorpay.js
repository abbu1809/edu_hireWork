import Razorpay from "razorpay";
import { config, isRazorpayConfigured } from "./env.js";

// Null when keys are missing; payment endpoints then answer 503.
export const razorpay = isRazorpayConfigured()
  ? new Razorpay({ key_id: config.razorpay.keyId, key_secret: config.razorpay.keySecret })
  : null;
