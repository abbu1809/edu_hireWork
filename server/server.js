import { config, missingRequiredEnv, isRazorpayConfigured } from "./src/config/env.js";

const missing = missingRequiredEnv();
if (missing.length > 0) {
  console.error(
    `\n[EduHire API] Missing required environment variables: ${missing.join(", ")}.\n` +
      "Copy server/.env.example to server/.env and fill in your Supabase project keys.\n"
  );
  process.exit(1);
}

// Imported after the env check: the Supabase clients are created at import time.
const { default: app } = await import("./src/app.js");

const server = app.listen(config.port, () => {
  console.log(`[EduHire API] Listening on http://localhost:${config.port} (${config.nodeEnv})`);
  console.log(`[EduHire API] Allowed client origins: ${config.clientUrls.join(", ")}`);
  if (!isRazorpayConfigured()) {
    console.warn("[EduHire API] Razorpay keys not set — contact unlock payments are disabled.");
  }
  import("./src/config/mailer.js").then(async ({ verifyMailTransport, mailMode }) => {
    if (mailMode === "log") {
      console.warn("[EduHire API] SMTP not set — emails (incl. OTP codes) are printed to this console instead of being sent.");
      return;
    }
    if (mailMode === "disabled") {
      console.warn("[EduHire API] SMTP not set — emails are disabled and sign-up uses Supabase confirmation emails.");
      return;
    }
    const check = await verifyMailTransport();
    console.log(check.ok ? "[EduHire API] SMTP connection verified — email is live." : `[EduHire API] SMTP login failed: ${check.error}`);
  });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n[EduHire API] Port ${config.port} is already in use — another server instance is probably running. Stop it or change PORT in server/.env.\n`);
    process.exit(1);
  }
  throw err;
});

const shutdown = (signal) => {
  console.log(`${signal} received. Shutting down...`);
  server.close(() => process.exit(0));
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
