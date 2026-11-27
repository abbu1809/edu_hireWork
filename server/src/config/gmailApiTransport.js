/**
 * Nodemailer transport that hands the finished email to the Gmail API over
 * HTTPS (port 443) instead of SMTP. Render's free plan blocks SMTP ports
 * (25/465/587) but not HTTPS. Nodemailer still builds the message (From alias,
 * Reply-To, HTML, text), so Gmail "Send mail as" aliases work as before.
 * No extra packages: Node's built-in fetch + an OAuth2 refresh token.
 * Get the token once with `npm run gmail:auth`.
 */

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const TIMEOUT_MS = 20000;

// Shaped like Nodemailer errors so email.service's retry logic works unchanged:
// ECONNECTION / 421 = transient (retried), anything else = permanent.
const mailError = (message, transient) =>
  Object.assign(new Error(message), transient ? { code: "ECONNECTION", responseCode: 421 } : { code: "EGMAILAPI", responseCode: 550 });

const call = async (url, init) => {
  let res;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    throw mailError(`Gmail API unreachable: ${error.message}`, true);
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = body?.error?.message || body?.error_description || body?.error || res.statusText;
    throw mailError(`Gmail API error (HTTP ${res.status}): ${detail}`, res.status === 429 || res.status >= 500);
  }
  return body;
};

export const createGmailApiTransport = ({ clientId, clientSecret, refreshToken }) => {
  let token = null;
  let expiresAt = 0;
  let pending = null;

  const accessToken = () => {
    if (token && Date.now() < expiresAt - 60_000) return Promise.resolve(token);
    // One refresh shared by concurrent sends.
    pending ??= call(TOKEN_URL, {
      method: "POST",
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    })
      .then((data) => {
        token = data.access_token;
        expiresAt = Date.now() + (Number(data.expires_in) || 3600) * 1000;
        return token;
      })
      .catch((error) => {
        if (/invalid_grant/i.test(error.message)) {
          error.message += " — GMAIL_REFRESH_TOKEN expired or revoked: run `npm run gmail:auth` again (and keep the Google OAuth app 'In production').";
        }
        throw error;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  };

  return {
    name: "GmailAPI",
    version: "1.0.0",

    send(mail, callback) {
      // Gmail reads recipients from the headers, so keep Bcc in the raw message (Gmail strips it on delivery).
      mail.message.keepBcc = true;
      mail.message.build(async (buildError, raw) => {
        if (buildError) return callback(buildError);
        try {
          const data = await call(SEND_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
            body: JSON.stringify({ raw: raw.toString("base64url") }),
          });
          callback(null, { envelope: mail.message.getEnvelope(), messageId: mail.message.messageId(), response: `Gmail API ${data.id}` });
        } catch (error) {
          callback(error);
        }
      });
    },

    // Only the gmail.send scope is granted (can't read the mailbox), so verify = token refresh works.
    // Nodemailer passes verify() straight through, and the app awaits it without a callback.
    verify(callback) {
      const result = accessToken().then(() => true);
      if (callback) result.then((ok) => callback(null, ok), callback);
      return result;
    },
  };
};
