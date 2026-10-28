# EduHire Platform — Project Guide

_Last updated: 2026-10-04 (v2 restructure)_

## 1. Overview

EduHire Bridge is a hiring marketplace that connects teachers with coaching institutes and schools in India (IIT-JEE, NEET, K-12).

- A **teacher** signs up, builds a profile, uploads a resume and KYC documents, and applies to vacancies.
- An **institute** posts vacancies, browses the talent pool, moves applicants through an ATS pipeline, schedules demo lectures and pays (Razorpay) to **unlock** a teacher's phone, email and resume.
- The single **admin** verifies teachers and institutes, features or archives profiles, runs the content hub, matchmakes, broadcasts and reviews payments and inquiries.

## 2. Architecture

```
database/  →  server/  →  client/
Supabase       Express       React
(Postgres,     REST API      UI only
 Auth,         (MVC)
 Storage)
```

The browser talks **only** to the Express API. The API talks to Supabase. Every user request runs with that user's Supabase JWT, so the database's row-level security (RLS) still applies. The service-role key is used only for actions the API has already authorised: payment capture, unlocks, OAuth profile creation, broadcasts and public counts.

| Folder | What it is |
| --- | --- |
| `database/` | `schema.sql` plus dated migrations (tables, RLS, RPCs, storage buckets) |
| `server/` | Express REST API in MVC layers |
| `client/` | React app (feature-based structure). All data comes from the API, with no dummy data. |

## 3. Server (`server/src`)

| Layer | Folder | Role |
| --- | --- | --- |
| Config | `config/` | env vars, Supabase clients (user / anon / service), Razorpay |
| Models | `models/` | Table access (one file per table group) |
| Services | `services/` | auth, payments (Razorpay), storage, notifications |
| Controllers | `controllers/` | request validation and responses |
| Routes | `routes/` | URL → controller, with `authenticate` / `requireRole` guards |
| Middlewares | `middlewares/` | auth, file upload (multer), errors |

### API routes (all under `/api`)

| Area | Routes |
| --- | --- |
| Public | `GET /health`, `/stats`, `/settings`, `/payment-links`, `/form-fields`, `/institutes`; `POST /contact` |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/oauth/complete`, `/auth/forgot-password`, `/auth/reset-password`; `GET /auth/me`, `/auth/google`; `PUT /auth/password` |
| Vacancies | `GET /vacancies`, `/vacancies/:id`, `/vacancies/mine`; `POST/PUT/DELETE /vacancies[/:id]` (institute, admin) |
| Teachers | `GET /teachers`, `/teachers/:id` (public, safe fields); `PUT /teachers/me`; `GET/PUT /teachers/me/preferences` |
| Institutes | `PUT /institutes/me`; `GET /institutes/me/talent`, `/institutes/me/unlocked` |
| Applications | `GET /applications/mine` (teacher), `/applications/received` (institute); `POST /applications`; `PATCH /applications/:id/withdraw`, `/applications/:id/status` |
| Interviews | `GET /interviews/mine`; `POST /interviews` (institute) |
| Documents | `GET/POST /documents`; `GET /documents/:id/url`, `/documents/resume/url`; `DELETE /documents/:id` |
| Notifications | `GET /notifications`; `PATCH /notifications/:id/read`, `/notifications/read-all` |
| Payments | `GET /payments/config`, `/payments/mine`; `POST /payments/unlock-order`, `/payments/verify`, `/payments/webhook` (raw body, Razorpay signature) |
| Blog | `GET /blog`, `/blog/:slug`; `POST /blog/:slug/view` |
| Admin | `/admin/stats`, teachers/institutes (list, create, verify, feature, archive, flag, delete), audit-logs, vacancies, applications, matchmake, broadcast, payments, blog CRUD, form-fields, payment-links, settings, inquiries |

### Roles and sign-in

- Roles: `teacher`, `institute` and one `admin`. Sign-up always asks for Teacher or Institute.
- The admin account is the email in `ADMIN_EMAIL`, and it can be claimed only once.
- **Google sign-in:** on the Register tab, the chosen role is sent along with the Google request. On the Sign In tab, existing accounts keep their role. A brand-new Google account is shown a role picker at `/auth/callback` before the account is created, so nobody becomes a teacher by default.

## 4. Client (`client/src`)

**Stack:** React 18, React Router 7, Redux Toolkit (redux-thunk for async actions), TanStack Query, Axios, react-hot-toast, Tailwind (hybrid), lucide-react icons (no emojis).

```
app/        App, routes, Redux store, query client
shared/     axios client, layout (Navbar, Footer, Dashboard shell), guards, hooks, utils, constants
features/
  auth/        login, register, Google callback + role picker, reset password (Redux slice)
  home/        landing page
  vacancies/   /careers job board, vacancy detail, vacancy form
  faculty/     /faculty directory and profile, unlock action
  content/     content hub and articles
  site/        about, contact, legal, partner institutes
  notifications/
  payments/    Razorpay checkout (Redux slice)
  teacher/  institute/  admin/   the three portals
```

- **Redux** holds the session (user, auth status) and the checkout state.
- **TanStack Query** holds all server data (caching, refetching, invalidation after changes).
- **Styling:** the original design system (`styles/index.css`, green and gold palette from `DESIGN.md`) is unchanged. Tailwind runs alongside it with preflight off and is used for responsive layout.
- **Performance:**
  - Every page is lazy-loaded, and a page's code is prefetched when you hover or focus a link to it.
  - Vendor libraries are split into separately cached chunks.
  - Search inputs are debounced.
  - Action buttons are throttled.
  - List cards are memoized.
  - Images load lazily.
  - The Razorpay code loads only when checkout opens.

### Page routes

| Route | Page |
| --- | --- |
| `/` | Landing |
| `/careers`, `/careers/:id` | Public job board and vacancy detail (filters are kept in the URL) |
| `/faculty`, `/faculty/:id` | Public faculty directory and profile (contact details masked) |
| `/institutes` | Partner institutes |
| `/content-hub`, `/content-hub/:stream`, `/blog`, `/teacher-updates`, `/institute-updates`, `/blog/:slug` | Content hub and articles |
| `/about`, `/contact`, `/privacy`, `/terms`, `/disclaimer` | Static pages (the contact form saves an inquiry) |
| `/auth?mode=login\|signup\|forgot`, `/auth/callback`, `/auth/reset-password` | Authentication |
| `/notifications` | Notifications (any signed-in role) |
| `/teacher` + `jobs`, `applications`, `interviews`, `profile`, `settings` | Teacher portal |
| `/institute` + `talent`, `vacancies`, `applicants`, `unlocked`, `profile` | Institute portal |
| `/admin` + `teachers`, `institutes`, `vacancies`, `finance`, `content`, `governance` | Admin portal |

## 4a. Sessions: access and refresh tokens

| Token | What it is | Where it lives | Lifetime |
| --- | --- | --- | --- |
| Access token | Supabase JWT, sent as `Authorization: Bearer` (keeps database RLS working) | Browser **memory only** | About 1 hour; refreshed 60 seconds before expiry |
| Refresh token | Random 256-bit string issued by our API | **httpOnly cookie** `eh_rt`, scoped to `/api/auth`. Only its **SHA-256 hash** is stored, in `user_sessions` | 30 days (`REFRESH_TOKEN_TTL_DAYS`); **rotated on every refresh** |
| Supabase refresh token | Used server-side to mint new access tokens | `user_sessions.supabase_refresh_token_enc`, AES-256-GCM encrypted | Managed by Supabase |

**Flow:**
- **Login, sign-up or Google:** the API creates a `user_sessions` row, sets the cookie, and returns `{ accessToken, expiresAt }`.
- **Page load:** `POST /api/auth/refresh` exchanges the cookie for a new access token and the current user in one call.
- **On a 401:** the browser refreshes once and retries the request.

**Security:**
- Presenting an already-rotated refresh token more than 20 seconds after rotation counts as **reuse**: the whole session is revoked and a warning is logged. Within 20 seconds it counts as a two-tab race; the client retries, and the Web Locks API serializes refreshes across tabs.
- Every authenticated request checks the token's session row (cached 30 seconds), so **logout or revocation takes effect immediately** instead of when the access token expires.
- Changing your password signs out all other devices. A password reset signs out everyone.
- Login and sign-up are limited to 20 attempts per IP per 15 minutes; refresh to 60 per minute.

**Endpoints:** `POST /auth/refresh`, `POST /auth/logout` (works with an expired token), `POST /auth/logout-all`, `GET /auth/me`, `GET /auth/sessions`, `DELETE /auth/sessions/:id`, `DELETE /auth/sessions/others`. Native clients send `X-Auth-Mode: token` to receive the refresh token in the response body instead of a cookie.

**UI:** an **Active Sessions** card (teacher settings, institute profile, admin governance) lists devices and offers sign-out per device, sign out other devices, or sign out everywhere.

**Production:** keep the API on the same site as the client, either through a subdomain or by having the host proxy `/api/*` to the API, with `COOKIE_SAMESITE=lax`. A cross-site API needs `COOKIE_SAMESITE=none` over HTTPS, and Safari may block that cookie.

## 4b. Email (Nodemailer)

Code lives in `server/src/services/email/`: templates, the send queue, OTP, subscribers, broadcasts and job alerts. The tables are created by `database/migrations/20261005_email_services.sql`.

| Email | When it's sent | Can the user turn it off? |
| --- | --- | --- |
| Verification code (OTP) | Sign-up: 6 digits, expires after 10 minutes, 60-second resend cooldown, 5 codes per hour, 5 guesses per code | No |
| Welcome | New account (email sign-up or Google) | No |
| Subscribe confirmation | Newsletter sign-up in the footer, with a one-click unsubscribe link | Unsubscribe link |
| Job alert | An institute publishes a vacancy matching the teacher's subject | Teacher → Settings → Job Alerts |
| New application | A teacher applies; sent to the institute | Institute → Profile → Applicant emails |
| Application status | The institute changes an applicant's status | Teacher → Application Updates |
| Demo lecture scheduled | The institute schedules a demo | Teacher → Demo & Interview Alerts |
| Verification decision | The admin approves or rejects a profile | No |
| Payment receipt | A Razorpay payment is captured | No |
| Mediator recommendation | Admin matchmaking; sent to both sides | Teacher → Employer Interest; Institute → Applicant emails |
| Password changed | Any password change (security alert) | No |
| Contact inquiry | An acknowledgement to the sender, plus a copy to `ADMIN_NOTIFY_EMAIL` | — |
| Admin broadcast | Admin → Email Center | Newsletter & Announcements toggle, or the unsubscribe link |

**Admin Email Center** (`/admin/email`):
- Shows SMTP status and has a test send.
- Composes broadcasts to all members, all teachers, all institutes, newsletter subscribers, or hand-picked users, with a preview.
- Shows campaign history with delivered and failed counts.
- Lists subscribers.

**Delivery modes:**
- **SMTP configured:** emails are sent for real.
- **No SMTP in development:** emails, including OTP codes, are printed to the server console.
- **No SMTP in production:** emails are skipped and logged as SKIPPED, and sign-up falls back to Supabase confirmation emails.

**Send queue:** emails are sent from an in-memory queue (3 at a time, with retries) so API responses never wait on SMTP. Every send is recorded in `email_logs`.

## 5. Environment variables

**`server/.env`** (copy from `server/.env.example`):

| Variable | Required | Notes |
| --- | --- | --- |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase → Project Settings → API. The server will not start without them. |
| `PORT`, `NODE_ENV`, `CLIENT_URL` | — | `CLIENT_URL` is used for CORS and auth redirects (default `http://localhost:3000`) |
| `ADMIN_EMAIL` | — | The single admin account (default `admin@eduhirebridge.in`) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | For payments | Without them, the unlock button shows "payments not configured" |
| `RAZORPAY_WEBHOOK_SECRET` | Recommended | Webhook URL: `<server>/api/payments/webhook` |
| `INSTITUTE_UNLOCK_FEE` | — | INR, default 499 |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | For email | Any SMTP provider. For Gmail, use an App Password. |
| `FROM_EMAIL`, `FROM_NAME`, `REPLY_TO_EMAIL` | — | Sender identity. Use a domain with SPF/DKIM set up. |
| `ADMIN_NOTIFY_EMAIL` | — | Receives contact-form copies (defaults to `ADMIN_EMAIL`) |
| `REQUIRE_SIGNUP_OTP`, `OTP_TTL_MINUTES`, `OTP_SECRET` | — | Sign-up OTP is on by default, with a 10-minute expiry |

**`client/.env`** (optional, see `client/.env.example`): `VITE_API_URL` defaults to `/api`, which Vite proxies to `http://localhost:5000` during development. In production, set it to the deployed API URL, e.g. `https://api.example.com/api`.

Never put the service-role key or the Razorpay secret in any `VITE_` variable.

## 6. Run locally

1. **Database:** run `database/schema.sql`, then the migrations in `database/migrations/` in date order. The latest are `20261004_server_api_architecture.sql`, `20261005_email_services.sql`, `20261005_admin_via_api_only.sql` and `20261006_user_sessions.sql`. For an empty project, `database/setup_fresh_database.sql` contains everything in order. To rebuild an existing test project from scratch, run `database/reset_database.sql` first (it deletes all data and accounts), then `setup_fresh_database.sql`.
2. **Supabase dashboard:**
   - Enable the Email and Google providers.
   - Add `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/reset-password` to the redirect URLs.
3. **Server:** fill in `server/.env`, then `npm install --prefix server` and `npm run dev:server` (port 5000).
4. **Client:** `npm install --prefix client`, then `npm run dev:client` (http://localhost:3000).
5. Register once with the `ADMIN_EMAIL` address to create the admin account.

## 7. Deploy

- **Client:** any static host. Build with `npm run build` (output in `client/dist`), set `VITE_API_URL`, and configure the host to serve `index.html` for all unknown routes (SPA fallback). No host-specific config files are kept in the repo.
- **Server:** any Node 18+ host (Render, Railway, a VPS) with `npm start`. Set `CLIENT_URL` to the deployed site URL and add that URL's `/auth/callback` to the Supabase redirect URLs.
