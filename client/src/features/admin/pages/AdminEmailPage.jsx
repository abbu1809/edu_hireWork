import { useMemo, useState } from "react";
import { Mail, Send, Users, Building, CheckCircle2, AlertTriangle, Terminal, Search, Inbox, Eye } from "lucide-react";
import {
  useAdminInstitutes,
  useAdminTeachers,
  useEmailBroadcast,
  useEmailBroadcasts,
  useEmailStatus,
  useEmailTest,
  useSubscribers,
} from "../hooks/useAdmin";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { DashboardHeader, KpiCard } from "@/shared/components/layout/DashboardLayout";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import Modal from "@/shared/components/Modal";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { notify } from "@/shared/utils/notify";
import { formatDateTime } from "@/shared/utils/format";

const AUDIENCES = [
  { value: "ALL", label: "All members", hint: "Every teacher and institute (respects opt-outs)", icon: Users },
  { value: "TEACHER", label: "All teachers", hint: "Registered teachers who allow announcements", icon: Users },
  { value: "INSTITUTE", label: "All institutes", hint: "Partner institutes who allow announcements", icon: Building },
  { value: "SUBSCRIBERS", label: "Newsletter subscribers", hint: "People who subscribed from the website", icon: Inbox },
  { value: "SELECTED", label: "Selected users", hint: "Pick individual teachers or institutes", icon: CheckCircle2 },
];

const STATUS_BADGE = { QUEUED: "badge-pending", SENDING: "badge-gold", COMPLETED: "badge-verified", FAILED: "badge-rejected" };

function DeliveryStatus() {
  const { currentUser } = useAuth();
  const statusQuery = useEmailStatus();
  const test = useEmailTest();
  const [to, setTo] = useState(currentUser?.email || "");
  const s = statusQuery.data;

  const mode = !s
    ? null
    : s.mode === "smtp"
      ? s.connected
        ? { icon: CheckCircle2, cls: "badge-verified", label: "Live — SMTP connected" }
        : { icon: AlertTriangle, cls: "badge-rejected", label: "SMTP login failed" }
      : s.mode === "log"
        ? { icon: Terminal, cls: "badge-pending", label: "Dev mode — emails print to server console" }
        : { icon: AlertTriangle, cls: "badge-rejected", label: "Disabled — SMTP not configured" };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Delivery Status</h3>
        {mode && (
          <span className={`badge ${mode.cls}`}>
            <mode.icon size={13} aria-hidden="true" /> {mode.label}
          </span>
        )}
      </div>
      <QueryState query={statusQuery} loadingLabel="Checking email connection...">
        {s && (
          <>
            <dl className="info-panel" style={{ marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <dt>Sender</dt>
                <dd style={{ margin: 0, fontWeight: 600, wordBreak: "break-all" }}>{s.from}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <dt>Sign-up email OTP</dt>
                <dd style={{ margin: 0, fontWeight: 600 }}>{s.signupOtpRequired ? "Required" : "Off"}</dd>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem" }}>
                <dt>Emails in queue</dt>
                <dd style={{ margin: 0, fontWeight: 600 }}>{s.queued}</dd>
              </div>
            </dl>
            {s.error && (
              <p style={{ color: "var(--color-error)", fontSize: "0.85rem", marginBottom: "1rem", wordBreak: "break-word" }}>{s.error}</p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                test.mutate(to, { onSuccess: (res) => notify.success(res.message), onError: (error) => notify.apiError(error, "Test email failed.") });
              }}
              style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}
            >
              <label htmlFor="test-to" className="sr-only">
                Send test email to
              </label>
              <input
                id="test-to"
                type="email"
                className="input-field"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="you@example.com"
                style={{ flex: "2 1 200px", width: "auto" }}
                required
              />
              <button type="submit" className="btn btn-outline" disabled={test.isPending} style={{ flex: "1 1 140px" }}>
                <Send size={15} aria-hidden="true" /> {test.isPending ? "Sending..." : "Send test"}
              </button>
            </form>
          </>
        )}
      </QueryState>
    </div>
  );
}

/** Searchable checklist of teachers and institutes for "Selected users". */
function RecipientPicker({ selected, onChange }) {
  const [tab, setTab] = useState("teachers");
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim().toLowerCase(), 200);
  const teachersQuery = useAdminTeachers();
  const institutesQuery = useAdminInstitutes();

  const people = useMemo(() => {
    const source =
      tab === "teachers"
        ? (teachersQuery.data || []).map((t) => ({ id: t.id, name: t.name, email: t.email, meta: t.primary_subject }))
        : (institutesQuery.data || []).map((i) => ({ id: i.id, name: i.institute_name, email: i.email, meta: i.city }));
    return source.filter((p) => p.email && (!q || [p.name, p.email, p.meta].some((v) => (v || "").toLowerCase().includes(q))));
  }, [tab, q, teachersQuery.data, institutesQuery.data]);

  const query = tab === "teachers" ? teachersQuery : institutesQuery;
  const allVisibleSelected = people.length > 0 && people.every((p) => selected.has(p.id));

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  const toggleAllVisible = () => {
    const next = new Set(selected);
    people.forEach((p) => (allVisibleSelected ? next.delete(p.id) : next.add(p.id)));
    onChange(next);
  };

  return (
    <div style={{ border: "1px solid var(--color-border-input)", borderRadius: "var(--radius-card)", padding: "0.85rem", marginBottom: "1.15rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem", alignItems: "center" }}>
        <div className="segmented" role="tablist" style={{ flex: "1 1 240px" }}>
          {[
            ["teachers", "Teachers"],
            ["institutes", "Institutes"],
          ].map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
        <span className="badge badge-verified">{selected.size} selected</span>
        {selected.size > 0 && (
          <button type="button" className="btn btn-sm btn-dark-outline" onClick={() => onChange(new Set())}>
            Clear
          </button>
        )}
      </div>

      <div className="input-icon-wrap" style={{ marginBottom: "0.6rem" }}>
        <Search size={16} aria-hidden="true" />
        <input type="search" className="input-field" placeholder="Search name, email, subject or city..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search recipients" />
      </div>

      <QueryState query={query} loadingLabel="Loading users...">
        {people.length === 0 ? (
          <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", padding: "0.5rem" }}>No users match.</p>
        ) : (
          <>
            <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.45rem 0.5rem", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}>
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} /> Select all {people.length} shown
            </label>
            <ul style={{ listStyle: "none", maxHeight: "260px", overflowY: "auto", display: "grid", gap: "2px" }}>
              {people.map((p) => (
                <li key={p.id}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.65rem",
                      padding: "0.5rem",
                      borderRadius: "8px",
                      cursor: "pointer",
                      background: selected.has(p.id) ? "var(--color-brand-light-tint)" : "transparent",
                    }}
                  >
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: "block", fontWeight: 600, fontSize: "0.9rem" }}>{p.name}</span>
                      <span style={{ display: "block", fontSize: "0.78rem", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.email}
                        {p.meta ? ` · ${p.meta}` : ""}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}
      </QueryState>
    </div>
  );
}

/** Approximate inbox preview using the same structure as the server template. */
function EmailPreview({ subject, message, ctaLabel }) {
  return (
    <div style={{ background: "var(--color-canvas-warm)", borderRadius: "var(--radius-card)", padding: "1rem" }}>
      <div style={{ background: "var(--color-brand-house)", color: "#fff", fontWeight: 800, padding: "0.75rem 1rem", borderRadius: "10px 10px 0 0" }}>
        EduHire <span style={{ color: "var(--color-gold)" }}>Bridge</span>
      </div>
      <div style={{ background: "#fff", padding: "1.1rem 1rem", borderRadius: "0 0 10px 10px" }}>
        <div style={{ color: "var(--color-brand-green)", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.75rem" }}>{subject || "Your subject line"}</div>
        <p style={{ whiteSpace: "pre-line", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "0.9rem" }}>
          Hi Riya,
          {"\n\n"}
          {message || "Your message will appear here."}
        </p>
        {ctaLabel && (
          <span className="btn btn-primary btn-sm" style={{ pointerEvents: "none" }}>
            {ctaLabel}
          </span>
        )}
      </div>
      <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.6rem" }}>
        Each email is personalised with the recipient's first name and includes an unsubscribe / preferences link.
      </p>
    </div>
  );
}

function Composer() {
  const broadcast = useEmailBroadcast();
  const [audience, setAudience] = useState("TEACHER");
  const [selected, setSelected] = useState(() => new Set());
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [confirming, setConfirming] = useState(false);

  const audienceInfo = AUDIENCES.find((a) => a.value === audience);

  const validate = () => {
    if (audience === "SELECTED" && selected.size === 0) return "Select at least one recipient.";
    if (subject.trim().length < 3) return "Please enter an email subject.";
    if (message.trim().length < 5) return "Please write the email message.";
    if (Boolean(ctaLabel.trim()) !== Boolean(ctaUrl.trim())) return "Add both a button label and a button link, or neither.";
    if (ctaUrl.trim() && !/^https?:\/\//i.test(ctaUrl.trim())) return "The button link must start with http:// or https://";
    return null;
  };

  const send = () =>
    broadcast.mutate(
      {
        audience,
        userIds: audience === "SELECTED" ? [...selected] : undefined,
        subject: subject.trim(),
        message: message.trim(),
        ctaLabel: ctaLabel.trim() || undefined,
        ctaUrl: ctaUrl.trim() || undefined,
      },
      {
        onSuccess: (res) => {
          notify.success(res.message);
          setConfirming(false);
          setSubject("");
          setMessage("");
          setCtaLabel("");
          setCtaUrl("");
          setSelected(new Set());
        },
        onError: (error) => {
          setConfirming(false);
          notify.apiError(error, "Broadcast failed.");
        },
      }
    );

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Compose Email Broadcast</h3>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const problem = validate();
            if (problem) return notify.error(problem);
            setConfirming(true);
          }}
        >
          <fieldset style={{ border: "none", marginBottom: "1.15rem" }}>
            <legend className="form-label" style={{ marginBottom: "0.5rem" }}>
              Audience
            </legend>
            <div role="radiogroup" aria-label="Audience" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(170px, 100%), 1fr))", gap: "0.6rem" }}>
              {AUDIENCES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={audience === value}
                  className="option-card"
                  onClick={() => setAudience(value)}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", textAlign: "left", padding: "0.7rem 0.8rem" }}
                >
                  <Icon size={17} color="var(--color-brand-green)" aria-hidden="true" />
                  <span style={{ fontWeight: 600, fontSize: "0.88rem" }}>{label}</span>
                </button>
              ))}
            </div>
            <p className="form-hint" style={{ marginTop: "0.45rem" }}>
              {audienceInfo?.hint}
            </p>
          </fieldset>

          {audience === "SELECTED" && <RecipientPicker selected={selected} onChange={setSelected} />}

          <div className="form-group">
            <label className="form-label" htmlFor="eb-subject">
              Subject
            </label>
            <input id="eb-subject" type="text" className="input-field" maxLength={200} placeholder="e.g. 40 new NEET Biology vacancies this week" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="eb-message">
              Message
            </label>
            <textarea
              id="eb-message"
              className="input-field"
              rows={7}
              maxLength={10000}
              placeholder={"Write your announcement.\n\nLeave a blank line between paragraphs."}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <span className="form-hint">{message.length.toLocaleString("en-IN")} / 10,000 characters · plain text, links are kept as typed</span>
          </div>

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <div className="form-group">
              <label className="form-label" htmlFor="eb-cta-label">
                Button label (optional)
              </label>
              <input id="eb-cta-label" type="text" className="input-field" maxLength={60} placeholder="e.g. Browse vacancies" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="eb-cta-url">
                Button link (optional)
              </label>
              <input id="eb-cta-url" type="url" className="input-field" placeholder="https://eduhirebridge.in/careers" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={broadcast.isPending}>
            <Send size={16} aria-hidden="true" /> Review & Send
          </button>
        </form>

        <div>
          <div className="form-label" style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Eye size={15} aria-hidden="true" /> Preview
          </div>
          <EmailPreview subject={subject} message={message} ctaLabel={ctaLabel} />
        </div>
      </div>

      {confirming && (
        <Modal title="Send this email?" onClose={() => !broadcast.isPending && setConfirming(false)} maxWidth="460px">
          <p style={{ marginBottom: "1rem", color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--text-primary)" }}>“{subject.trim()}”</strong> will be sent to{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {audience === "SELECTED" ? `${selected.size} selected user${selected.size === 1 ? "" : "s"}` : audienceInfo?.label.toLowerCase()}
            </strong>
            . This can't be undone.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-dark-outline" style={{ flex: 1 }} onClick={() => setConfirming(false)} disabled={broadcast.isPending}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={send} disabled={broadcast.isPending}>
              <Send size={16} aria-hidden="true" /> {broadcast.isPending ? "Queuing..." : "Send now"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CampaignHistory() {
  const query = useEmailBroadcasts();
  const campaigns = query.data || [];
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Recent Campaigns</h3>
      </div>
      <QueryState query={query} loadingLabel="Loading campaigns...">
        {campaigns.length === 0 ? (
          <EmptyState bare icon={Mail} iconSize={24} title="No Email Campaigns Yet">
            Broadcasts you send will appear here with live delivery counts.
          </EmptyState>
        ) : (
          <div className="table-responsive" style={{ boxShadow: "none" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sent</th>
                  <th>Subject</th>
                  <th>Audience</th>
                  <th>Recipients</th>
                  <th>Delivered</th>
                  <th>Failed</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(c.created_at)}</td>
                    <td>
                      <strong>{c.subject}</strong>
                    </td>
                    <td>
                      <span className="badge badge-role">{AUDIENCES.find((a) => a.value === c.audience)?.label || c.audience}</span>
                    </td>
                    <td>{c.recipients_count}</td>
                    <td>{c.sent_count}</td>
                    <td style={{ color: c.failed_count ? "var(--color-error)" : undefined }}>{c.failed_count}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[c.status] || "badge-role"}`}>{c.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
    </div>
  );
}

function Subscribers() {
  const query = useSubscribers();
  const items = query.data?.items || [];
  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Newsletter Subscribers</h3>
        <span className="badge badge-verified">{query.data?.subscribed ?? 0} active</span>
      </div>
      <QueryState query={query} loadingLabel="Loading subscribers...">
        {items.length === 0 ? (
          <EmptyState bare icon={Inbox} iconSize={24} title="No Subscribers Yet">
            Visitors can subscribe from the website footer.
          </EmptyState>
        ) : (
          <div className="table-responsive" style={{ boxShadow: "none", maxHeight: "420px" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Since</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 200).map((s) => (
                  <tr key={s.id}>
                    <td style={{ wordBreak: "break-all" }}>{s.email}</td>
                    <td>{s.role ? <span className="badge badge-role">{s.role}</span> : "—"}</td>
                    <td>
                      <span className={`badge ${s.status === "SUBSCRIBED" ? "badge-verified" : "badge-pending"}`}>{s.status}</span>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDateTime(s.subscribed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </QueryState>
    </div>
  );
}

export default function AdminEmailPage() {
  useDocumentTitle("Email Center");
  const { data: campaigns = [] } = useEmailBroadcasts();
  const { data: subs } = useSubscribers();
  const delivered = campaigns.reduce((sum, c) => sum + (c.sent_count || 0), 0);

  return (
    <div>
      <DashboardHeader title="Email Center" subtitle="Broadcast emails to members or subscribers and monitor delivery" />

      <div className="kpi-grid">
        <KpiCard icon={Send} label="Campaigns" value={campaigns.length} />
        <KpiCard icon={CheckCircle2} label="Emails Delivered" value={delivered.toLocaleString("en-IN")} />
        <KpiCard icon={Inbox} label="Subscribers" value={subs?.subscribed ?? "—"} />
      </div>

      <div style={{ display: "grid", gap: "1.5rem" }}>
        <Composer />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <DeliveryStatus />
          <Subscribers />
        </div>
        <CampaignHistory />
      </div>
    </div>
  );
}
