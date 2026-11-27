/**
 * One-time: prints a GMAIL_REFRESH_TOKEN so the server can send via the Gmail API.
 * Needs GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in server/.env. Run: npm run gmail:auth
 */
import http from "node:http";
import crypto from "node:crypto";
import { exec } from "node:child_process";
import dotenv from "dotenv";

dotenv.config();
const clientId = (process.env.GMAIL_CLIENT_ID || "").trim();
const clientSecret = (process.env.GMAIL_CLIENT_SECRET || "").trim();
if (!clientId || !clientSecret) {
  console.error("\nAdd GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET to server/.env first.\n");
  process.exit(1);
}

const state = crypto.randomBytes(16).toString("hex");
const verifier = crypto.randomBytes(48).toString("base64url"); // PKCE
const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
let redirectUri;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);
  if (url.pathname !== "/") return res.writeHead(404).end();
  const done = (msg) => {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(`<p style="font-family:sans-serif">${msg}</p>`);
    server.close();
  };
  if (url.searchParams.get("state") !== state) return done("State mismatch. Run the script again.");
  const code = url.searchParams.get("code");
  if (!code) return done(`Not authorized: ${url.searchParams.get("error") || "no code"}`);

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: verifier }),
  });
  const data = await r.json();
  if (!data.refresh_token) {
    console.error("\nFailed:", data.error_description || data.error || "no refresh_token returned", "\n");
    return done("Failed: see the terminal.");
  }
  console.log(`\nAdd this to server/.env and to Render → Environment (keep it secret):\n\nGMAIL_REFRESH_TOKEN=${data.refresh_token}\n`);
  done("Done. Close this tab and go back to the terminal.");
});

server.listen(0, "127.0.0.1", () => {
  redirectUri = `http://127.0.0.1:${server.address().port}`;
  const authUrl =
    "https://accounts.google.com/o/oauth2/v2/auth?" +
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/gmail.send",
      access_type: "offline",
      prompt: "consent",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
  console.log(`\nOpen this link and sign in with the Gmail account that sends the emails:\n\n${authUrl}\n`);
  exec(process.platform === "win32" ? `start "" "${authUrl}"` : `open "${authUrl}" || xdg-open "${authUrl}"`, () => {});
});
