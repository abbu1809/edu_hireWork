import { config } from "../../config/env.js";

// ---------------------------------------------------------------------------
// Email templates. Table layout + inline styles so they render in Gmail,
// Outlook and Apple Mail. Colours follow DESIGN.md (House Green header, Green
// Accent CTA pill, warm cream canvas). Every template returns
// { subject, html, text } — the text part is the accessible / spam-safe fallback.
// ---------------------------------------------------------------------------

const BRAND = {
  house: "#1E3932",
  green: "#006241",
  accent: "#00754A",
  gold: "#CBA258",
  canvas: "#F2F0EB",
  text: "#212121",
  muted: "#6B6B6B",
};

export const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const appUrl = (path = "/") => `${config.clientUrl}${path.startsWith("/") ? path : `/${path}`}`;

/** Plain text → safe HTML paragraphs (blank line = new paragraph, newline = <br>). */
const paragraphs = (text = "") =>
  escapeHtml(text)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BRAND.text};">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

const button = (label, url) => `
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 24px;">
    <tr><td style="border-radius:50px;background:${BRAND.accent};">
      <a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:12px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:50px;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;

const detailsTable = (rows) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background:${BRAND.canvas};border-radius:10px;">
    ${rows
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(
        ([k, v]) => `<tr>
          <td style="padding:10px 16px;font-size:13px;color:${BRAND.muted};width:38%;vertical-align:top;">${escapeHtml(k)}</td>
          <td style="padding:10px 16px;font-size:14px;color:${BRAND.text};font-weight:600;">${escapeHtml(v)}</td>
        </tr>`
      )
      .join("")}
  </table>`;

/**
 * Shared shell. `footerNote` explains why the recipient got the email and how
 * to stop it (required for bulk mail).
 */
const layout = ({ preheader = "", heading, body, footerNote = "" }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.canvas};font-family:Arial,Helvetica,sans-serif;">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${BRAND.canvas};">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
        <tr><td style="background:${BRAND.house};border-radius:12px 12px 0 0;padding:20px 28px;">
          <a href="${appUrl("/")}" style="text-decoration:none;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">EduHire <span style="color:${BRAND.gold};">Bridge</span></a>
        </td></tr>
        <tr><td style="background:#ffffff;padding:32px 28px 12px;border-radius:0 0 12px 12px;">
          <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:${BRAND.green};font-weight:700;">${escapeHtml(heading)}</h1>
          ${body}
        </td></tr>
        <tr><td style="padding:20px 28px;text-align:center;font-size:12px;line-height:1.6;color:${BRAND.muted};">
          ${footerNote ? `${footerNote}<br>` : ""}
          EduHire Bridge · Verified faculty hiring for IIT-JEE, NEET &amp; schools across India<br>
          <a href="${appUrl("/privacy")}" style="color:${BRAND.muted};">Privacy</a> · <a href="${appUrl("/contact")}" style="color:${BRAND.muted};">Contact support</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const textFooter = (note = "") => `\n\n—\n${note ? `${note}\n` : ""}EduHire Bridge · ${appUrl("/")}`;

const firstName = (name) => (name ? String(name).trim().split(/\s+/)[0] : "there");

const PURPOSE_COPY = {
  SIGNUP: { title: "Verify your email", action: "finish creating your EduHire Bridge account" },
  EMAIL_CHANGE: { title: "Confirm your new email", action: "confirm your new email address" },
  LOGIN: { title: "Your sign-in code", action: "sign in to EduHire Bridge" },
};

// ---------------------------------------------------------------------------
export const templates = {
  otp: ({ code, purpose = "SIGNUP", minutes }) => {
    const copy = PURPOSE_COPY[purpose] || PURPOSE_COPY.SIGNUP;
    const subject = `${code} is your EduHire Bridge verification code`;
    const html = layout({
      preheader: `Use ${code} to ${copy.action}. Expires in ${minutes} minutes.`,
      heading: copy.title,
      body: `
        <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${BRAND.text};">Use this code to ${escapeHtml(copy.action)}:</p>
        <div style="margin:0 0 20px;padding:18px;text-align:center;background:${BRAND.canvas};border-radius:10px;font-family:'Courier New',monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:${BRAND.house};">${escapeHtml(code)}</div>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${BRAND.muted};">The code expires in ${minutes} minutes. If you didn't request it, you can safely ignore this email — nobody can use it without access to your inbox.</p>`,
      footerNote: "You received this because someone entered your address on EduHire Bridge.",
    });
    const text = `${copy.title}\n\nYour code: ${code}\n\nUse it to ${copy.action}. It expires in ${minutes} minutes. If you didn't request it, ignore this email.${textFooter()}`;
    return { subject, html, text };
  },

  welcome: ({ name, role }) => {
    const isInstitute = role === "institute";
    const path = isInstitute ? "/institute" : "/teacher";
    const subject = `Welcome to EduHire Bridge, ${firstName(name)}!`;
    const steps = isInstitute
      ? ["Complete your institute profile", "Post your first teaching vacancy", "Shortlist applicants and schedule demo lectures"]
      : ["Complete your profile and add a headline", "Upload your resume, ID proof and degree certificates", "Apply to verified coaching & school vacancies — free"];
    const html = layout({
      preheader: isInstitute ? "Post your first vacancy and meet verified faculty." : "Get verified and start applying to teaching jobs.",
      heading: `Welcome aboard, ${firstName(name)}`,
      body: `
        ${paragraphs(
          isInstitute
            ? "Your institute account is ready. EduHire Bridge helps you hire KYC-verified IIT-JEE, NEET and school faculty with demo lectures and a simple applicant pipeline."
            : "Your teacher account is ready. Verified profiles get up to 4x more interview invitations from coaching institutes and schools."
        )}
        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:${BRAND.text};">Your next steps</p>
        <ol style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.8;color:${BRAND.text};">
          ${steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}
        </ol>
        ${button("Open my dashboard", appUrl(path))}`,
    });
    const text = `Welcome aboard, ${firstName(name)}!\n\nYour ${isInstitute ? "institute" : "teacher"} account is ready.\n\nNext steps:\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nOpen your dashboard: ${appUrl(path)}${textFooter()}`;
    return { subject, html, text };
  },

  subscribeConfirm: ({ name, unsubscribeUrl }) => {
    const subject = "You're subscribed to EduHire Bridge updates";
    const html = layout({
      preheader: "Hiring trends, teaching jobs and career guides — straight to your inbox.",
      heading: `Thanks for subscribing${name ? `, ${firstName(name)}` : ""}!`,
      body: `
        ${paragraphs("You'll receive occasional updates on new teaching vacancies, faculty salary trends, JEE/NEET hiring insights and career guides from our editorial team. No spam — and you can leave any time.")}
        ${button("Read the latest articles", appUrl("/content-hub"))}`,
      footerNote: `Don't want these emails? <a href="${escapeHtml(unsubscribeUrl)}" style="color:${BRAND.muted};">Unsubscribe in one click</a>.`,
    });
    const text = `Thanks for subscribing!\n\nYou'll receive occasional updates on teaching vacancies, salary trends and career guides.\n\nLatest articles: ${appUrl("/content-hub")}${textFooter(`Unsubscribe: ${unsubscribeUrl}`)}`;
    return { subject, html, text };
  },

  jobAlert: ({ name, vacancy }) => {
    const url = appUrl(`/careers/${vacancy.id}`);
    const subject = `New ${vacancy.subject} vacancy: ${vacancy.title} (${vacancy.city})`;
    const html = layout({
      preheader: `${vacancy.institute_name} is hiring in ${vacancy.city}. Salary ${vacancy.salary_range}.`,
      heading: "A new vacancy matches your profile",
      body: `
        ${paragraphs(`Hi ${firstName(name)}, ${vacancy.institute_name} just posted a role that matches your subject.`)}
        <p style="margin:0 0 12px;font-size:17px;font-weight:700;color:${BRAND.house};">${escapeHtml(vacancy.title)}</p>
        ${detailsTable([
          ["Institute", vacancy.institute_name],
          ["Subject", vacancy.subject],
          ["City", vacancy.city],
          ["Salary", vacancy.salary_range],
          ["Experience", vacancy.min_experience],
          ["Urgency", vacancy.urgency !== "Normal" ? vacancy.urgency : ""],
        ])}
        ${button("View & apply", url)}`,
      footerNote: `You're getting job alerts because they're on in your settings. <a href="${appUrl("/teacher/settings")}" style="color:${BRAND.muted};">Turn off job alerts</a>.`,
    });
    const text = `New vacancy matching your profile\n\n${vacancy.title}\n${vacancy.institute_name} · ${vacancy.city}\nSalary: ${vacancy.salary_range}\n\nView & apply: ${url}${textFooter(`Turn off job alerts: ${appUrl("/teacher/settings")}`)}`;
    return { subject, html, text };
  },

  applicationReceived: ({ instituteName, teacherName, vacancyTitle }) => {
    const url = appUrl("/institute/applicants");
    const subject = `New application: ${teacherName} for ${vacancyTitle}`;
    const html = layout({
      preheader: `${teacherName} applied for ${vacancyTitle}.`,
      heading: "You have a new applicant",
      body: `
        ${paragraphs(`Hi ${instituteName || "there"}, ${teacherName} has applied for “${vacancyTitle}”. Review the profile, update the status or schedule a demo lecture from your ATS.`)}
        ${button("Review applicant", url)}`,
      footerNote: `Manage email notifications in your <a href="${appUrl("/institute/profile")}" style="color:${BRAND.muted};">institute settings</a>.`,
    });
    const text = `New applicant\n\n${teacherName} applied for "${vacancyTitle}".\n\nReview: ${url}${textFooter()}`;
    return { subject, html, text };
  },

  applicationStatus: ({ name, vacancyTitle, instituteName, statusLabel }) => {
    const url = appUrl("/teacher/applications");
    const subject = `Application update: ${statusLabel} — ${vacancyTitle}`;
    const good = ["Shortlisted", "Interview / Demo", "Selected"].includes(statusLabel);
    const html = layout({
      preheader: `${instituteName} updated your application to ${statusLabel}.`,
      heading: good ? `Good news — you're ${statusLabel.toLowerCase()}!` : "Your application status changed",
      body: `
        ${paragraphs(`Hi ${firstName(name)}, ${instituteName} updated your application for “${vacancyTitle}”.`)}
        ${detailsTable([
          ["Vacancy", vacancyTitle],
          ["Institute", instituteName],
          ["New status", statusLabel],
        ])}
        ${button("Track my applications", url)}`,
      footerNote: `Turn application emails on or off in <a href="${appUrl("/teacher/settings")}" style="color:${BRAND.muted};">settings</a>.`,
    });
    const text = `Application update\n\n${vacancyTitle} at ${instituteName}\nNew status: ${statusLabel}\n\nTrack: ${url}${textFooter()}`;
    return { subject, html, text };
  },

  interviewScheduled: ({ name, instituteName, vacancyTitle, when, topic, meetingLink, notes }) => {
    const url = appUrl("/teacher/interviews");
    const subject = `Demo lecture scheduled: ${when} — ${instituteName}`;
    const html = layout({
      preheader: `${instituteName} scheduled your demo lecture for ${when}.`,
      heading: "Your demo lecture is scheduled",
      body: `
        ${paragraphs(`Hi ${firstName(name)}, ${instituteName} would like to see you teach. Here are the details:`)}
        ${detailsTable([
          ["Vacancy", vacancyTitle],
          ["When", when],
          ["Topic", topic],
          ["Meeting link", meetingLink],
          ["Instructions", notes],
        ])}
        ${meetingLink ? button("Join the trial room", meetingLink) : button("View demo details", url)}
        <p style="margin:0 0 16px;font-size:13px;color:${BRAND.muted};">Tip: keep a whiteboard (or digital pen) ready and prepare 1–2 solved problems.</p>`,
    });
    const text = `Demo lecture scheduled\n\nInstitute: ${instituteName}\nVacancy: ${vacancyTitle}\nWhen: ${when}\nTopic: ${topic}${meetingLink ? `\nLink: ${meetingLink}` : ""}${notes ? `\nInstructions: ${notes}` : ""}\n\nDetails: ${url}${textFooter()}`;
    return { subject, html, text };
  },

  verificationDecision: ({ name, approved, reason, role }) => {
    const url = appUrl(role === "institute" ? "/institute/profile" : "/teacher/profile");
    const subject = approved ? "Your EduHire Bridge profile is verified" : "Action needed: verification update";
    const html = layout({
      preheader: approved ? "You now have the Verified badge." : "Please review the note and update your documents.",
      heading: approved ? "You're verified!" : "We couldn't verify your profile yet",
      body: `
        ${paragraphs(
          approved
            ? `Congratulations ${firstName(name)} — our team has verified your credentials. Your profile now shows the Verified badge, which institutes trust most.`
            : `Hi ${firstName(name)}, our team reviewed your submission but couldn't approve it yet.${reason ? `\n\nReviewer note: ${reason}` : ""}\n\nPlease update your documents and we'll review them again within 24–48 hours.`
        )}
        ${button(approved ? "View my profile" : "Update documents", url)}`,
    });
    const text = `${approved ? "You're verified!" : "Verification update"}\n\n${approved ? "Your profile now shows the Verified badge." : `We couldn't approve your submission yet.${reason ? ` Reviewer note: ${reason}` : ""}`}\n\n${url}${textFooter()}`;
    return { subject, html, text };
  },

  paymentReceipt: ({ name, amount, purpose, paymentId, orderId, method, date }) => {
    const url = appUrl("/institute/unlocked");
    const subject = `Payment receipt · ₹${amount} · ${purpose}`;
    const html = layout({
      preheader: `We received ₹${amount}. Your contact unlock is active.`,
      heading: "Payment received — thank you",
      body: `
        ${paragraphs(`Hi ${name || "there"}, your payment was successful and the teacher's contact details and resume are now unlocked.`)}
        ${detailsTable([
          ["Amount", `₹${amount}`],
          ["For", purpose],
          ["Payment ID", paymentId],
          ["Order ID", orderId],
          ["Method", method],
          ["Date", date],
        ])}
        ${button("View unlocked contacts", url)}
        <p style="margin:0 0 16px;font-size:13px;color:${BRAND.muted};">Keep this email as your receipt. Payments are processed securely by Razorpay.</p>`,
    });
    const text = `Payment received\n\nAmount: ₹${amount}\nFor: ${purpose}\nPayment ID: ${paymentId}\nOrder ID: ${orderId}\nDate: ${date}\n\nUnlocked contacts: ${url}${textFooter()}`;
    return { subject, html, text };
  },

  matchRecommendation: ({ name, message, path }) => {
    const url = appUrl(path || "/");
    const subject = "EduHire Bridge has a recommendation for you";
    const html = layout({
      preheader: message,
      heading: "A hand-picked recommendation",
      body: `${paragraphs(`Hi ${firstName(name)},\n\n${message}`)}${button("Take a look", url)}`,
    });
    const text = `A recommendation for you\n\n${message}\n\n${url}${textFooter()}`;
    return { subject, html, text };
  },

  passwordChanged: ({ name }) => {
    const subject = "Your EduHire Bridge password was changed";
    const html = layout({
      preheader: "If this wasn't you, reset your password now.",
      heading: "Password changed",
      body: `
        ${paragraphs(`Hi ${firstName(name)}, the password for your EduHire Bridge account was just changed.\n\nIf you made this change, no action is needed. If you didn't, reset your password immediately and contact support.`)}
        ${button("Reset password", appUrl("/auth?mode=forgot"))}`,
      footerNote: "This is a security notification and can't be turned off.",
    });
    const text = `Password changed\n\nIf this wasn't you, reset your password: ${appUrl("/auth?mode=forgot")}${textFooter()}`;
    return { subject, html, text };
  },

  inquiryAck: ({ name }) => {
    const subject = "We received your message — EduHire Bridge";
    const html = layout({
      preheader: "Our team will reply within 4 business hours.",
      heading: `Thanks, ${firstName(name)} — we're on it`,
      body: `${paragraphs("We've received your message. A member of our team will get back to you within 4 business hours (Mon–Sat, 9 AM–7 PM IST).")}${button("Browse teaching vacancies", appUrl("/careers"))}`,
    });
    const text = `Thanks — we received your message and will reply within 4 business hours.${textFooter()}`;
    return { subject, html, text };
  },

  inquiryAdmin: ({ name, email, role, message }) => {
    const subject = `New contact inquiry from ${name}`;
    const html = layout({
      heading: "New contact inquiry",
      body: `${detailsTable([
        ["Name", name],
        ["Email", email],
        ["Role", role],
      ])}${paragraphs(message)}${button("Open admin governance", appUrl("/admin/governance"))}`,
    });
    const text = `New contact inquiry\n\nName: ${name}\nEmail: ${email}\nRole: ${role || "-"}\n\n${message}${textFooter()}`;
    return { subject, html, text };
  },

  broadcast: ({ name, subject, message, ctaLabel, ctaUrl, unsubscribeUrl, preferencesUrl }) => {
    const optOut = unsubscribeUrl
      ? `You're receiving this as an EduHire Bridge subscriber. <a href="${escapeHtml(unsubscribeUrl)}" style="color:${BRAND.muted};">Unsubscribe</a>.`
      : preferencesUrl
        ? `You're receiving this as an EduHire Bridge member. <a href="${escapeHtml(preferencesUrl)}" style="color:${BRAND.muted};">Email preferences</a>.`
        : "";
    const html = layout({
      preheader: String(message).slice(0, 120),
      heading: subject,
      body: `${paragraphs(`Hi ${firstName(name)},\n\n${message}`)}${ctaLabel && ctaUrl ? button(ctaLabel, ctaUrl) : ""}`,
      footerNote: optOut,
    });
    const text = `${subject}\n\nHi ${firstName(name)},\n\n${message}${ctaLabel && ctaUrl ? `\n\n${ctaLabel}: ${ctaUrl}` : ""}${textFooter(
      unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : preferencesUrl ? `Email preferences: ${preferencesUrl}` : ""
    )}`;
    return { subject, html, text };
  },
};

export const TEMPLATE_NAMES = Object.keys(templates);
export { appUrl };
