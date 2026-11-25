import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import zlib from "zlib";
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
      return callback(null, false);
    },
    credentials: true,
  })
);

// Razorpay signs the raw request body, so this route must skip the JSON parser.
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), PaymentController.webhook);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Compress JSON/text payloads >= 1KB using built-in gzip (zero extra deps).
app.use((req, res, next) => {
  if (!String(req.headers["accept-encoding"] || "").includes("gzip")) return next();
  const origJson = res.json.bind(res);
  res.json = (body) => {
    const raw = JSON.stringify(body);
    if (raw.length < 1024 || res.headersSent) return origJson(body);
    zlib.gzip(raw, (err, compressed) => {
      if (err || res.headersSent) return origJson(body);
      res.set("Content-Encoding", "gzip");
      res.set("Vary", "Accept-Encoding");
      res.set("Content-Type", "application/json; charset=utf-8");
      res.send(compressed);
    });
    return res;
  };
  next();
});

if (config.nodeEnv !== "production") app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.json({ success: true, message: "FacultyKart API is running.", health: "/api/health" });
});

app.use("/api", apiRouter);

app.use(notFound);
app.use(errorHandler);

export default app;
