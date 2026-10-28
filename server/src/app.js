import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { config } from "./config/env.js";
import apiRouter from "./routes/index.js";
import { PaymentController } from "./controllers/payment.controller.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";

const app = express();

app.disable("x-powered-by");
// Behind Render/Railway/Nginx: use the client IP from X-Forwarded-For (rate limits, OTP logs).
app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin tools (curl, health checks) and the configured client origins.
      if (!origin || config.clientUrls.includes(origin.replace(/\/$/, ""))) return callback(null, true);
      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true,
  })
);

// Razorpay signs the raw request body, so this route must skip the JSON parser.
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), PaymentController.webhook);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

if (config.nodeEnv !== "production") app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({ success: true, message: "EduHire Bridge API is running.", health: "/api/health" });
});

app.use("/api", apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
