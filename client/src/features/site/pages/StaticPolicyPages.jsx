import { useState } from "react";
import { Link } from "react-router";
import { Mail, MapPin, Phone, Send, CheckCircle2, ShieldCheck, Target, Zap } from "lucide-react";
import { useContactInquiry, usePlatformSettings } from "../hooks/useSite";
import { useSeo, SITE_URL } from "@/shared/seo/useSeo";
import { breadcrumbSchema, faqSchema } from "@/shared/seo/schema";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import Accordion from "@/shared/components/Accordion";

const DESCRIPTIONS = {
  about:
    "EduHire Bridge is India's verified faculty-hiring platform for IIT-JEE, NEET and school institutions — credential checks, demo lectures and an applicant tracking system in one place.",
  contact: "Contact the EduHire Bridge team for institute hiring support, teacher verification questions or partnership inquiries.",
  privacy: "How EduHire Bridge collects, protects and masks educator and institute data, including contact details and payments.",
  terms: "Terms of service for institutes and educators using the EduHire Bridge hiring platform.",
  disclaimer: "EduHire Bridge is a hiring mediation and verification platform; employment contracts are between candidates and institutions.",
};

// Answer-first Q&A for answer engines (published as FAQPage structured data).
const ABOUT_FAQS = [
  {
    q: "Who can use EduHire Bridge?",
    a: "Teachers and subject faculty looking for coaching or school jobs, and coaching institutes, schools and junior colleges hiring for IIT-JEE, NEET, Foundation, Olympiad and K-12 roles anywhere in India.",
  },
  {
    q: "How much does EduHire Bridge cost?",
    a: "Teachers use the platform for free. Institutes can post vacancies and review applicants for free and pay a one-time fee only when they unlock a teacher's direct contact details and resume.",
  },
  {
    q: "How long does teacher verification take?",
    a: "Our team usually reviews submitted ID proofs and degree certificates within 24–48 hours. Verified profiles get a Verified badge and can be featured to institutes.",
  },
  {
    q: "Which cities does EduHire Bridge cover?",
    a: "Institutes and teachers from any Indian city can join. Most activity today is in Kota, Delhi NCR, Bangalore and Hyderabad.",
  },
];
import { notify } from "@/shared/utils/notify";

const TITLES = {
  about: "About Us",
  contact: "Contact & Regional Desks",
  privacy: "Privacy Policy",
  terms: "Terms of Service",
  disclaimer: "Disclaimer",
};

const articleStyle = { padding: "clamp(1.5rem, 5vw, 3rem) clamp(1.25rem, 4vw, 2.5rem)", lineHeight: "1.75" };

function ContactSection() {
  const { data: settings } = usePlatformSettings();
  const contact = useContactInquiry();
  const [form, setForm] = useState({ name: "", email: "", role: "Institute", message: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    contact.mutate(form, {
      onSuccess: () => notify.success("Thank you for reaching out. A regional coordinator will contact you shortly."),
      onError: (error) => notify.apiError(error, "Could not send your inquiry."),
    });
  };

  const email = settings?.contact_email;
  const phone = settings?.support_phone;
  const address = settings?.office_address;

  return (
    <article className="card" style={articleStyle}>
      <div style={{ borderBottom: "1px solid var(--color-canvas-ceramic)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
        <span className="badge badge-gold" style={{ marginBottom: "0.75rem" }}>
          Support & Desks
        </span>
        <h1 className="serif-headline" style={{ fontSize: "clamp(1.85rem, 5vw, 2.4rem)", color: "var(--color-brand-house)", marginBottom: "0.5rem" }}>
          Contact EduHire Bridge
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem" }}>Reach out to our academic talent advisors or visit our regional coordination hubs.</p>
      </div>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "1.25rem" }}>Send Direct Inquiry</h3>
          {contact.isSuccess ? (
            <div style={{ background: "var(--color-success-bg)", padding: "1.5rem", borderRadius: "var(--radius-card)", textAlign: "center" }}>
              <CheckCircle2 size={36} color="var(--color-brand-accent)" style={{ margin: "0 auto 0.75rem" }} />
              <h4 style={{ fontWeight: "700", marginBottom: "0.5rem" }}>Inquiry Received</h4>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Our recruitment desk will respond within 4 business hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="contact-name">
                  Your Name
                </label>
                <input id="contact-name" type="text" className="input-field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="contact-email">
                  Email Address
                </label>
                <input
                  id="contact-email"
                  type="email"
                  className="input-field"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="contact-role">
                  I am a
                </label>
                <select id="contact-role" className="input-select" style={{ width: "100%" }} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="Institute">Institute / School</option>
                  <option value="Teacher">Teacher / Faculty</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="contact-message">
                  Message / Requirement
                </label>
                <textarea
                  id="contact-message"
                  className="input-field"
                  rows={4}
                  required
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%" }} disabled={contact.isPending}>
                <Send size={16} /> {contact.isPending ? "Sending..." : "Submit Inquiry"}
              </button>
            </form>
          )}
        </div>

        <div>
          <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "1.25rem" }}>Official Contact Points</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {email && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                <Mail size={20} color="var(--color-brand-accent)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: "600" }}>General & Recruiter Inquiries</div>
                  <a href={`mailto:${email}`} style={{ color: "var(--color-brand-green)", wordBreak: "break-all" }}>
                    {email}
                  </a>
                </div>
              </div>
            )}

            {phone && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                <Phone size={20} color="var(--color-brand-accent)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: "600" }}>Helpline & WhatsApp Support</div>
                  <a href={`tel:${String(phone).replace(/\s/g, "")}`} style={{ color: "var(--text-secondary)" }}>
                    {phone}
                  </a>
                </div>
              </div>
            )}

            {address && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                <MapPin size={20} color="var(--color-brand-accent)" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: "600" }}>Central Desk</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{address}</div>
                </div>
              </div>
            )}

            {!email && !phone && !address && (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Use the inquiry form and our team will get back to you by email.</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function StaticPolicyPages({ page = "about" }) {
  const crumbs = [{ name: "Home", path: "/" }, { name: TITLES[page], path: `/${page}` }];
  const pageType = page === "about" ? "AboutPage" : page === "contact" ? "ContactPage" : "WebPage";
  useSeo({
    title: TITLES[page],
    description: DESCRIPTIONS[page],
    path: `/${page}`,
    jsonLd: [
      { "@context": "https://schema.org", "@type": pageType, name: TITLES[page], url: `${SITE_URL}/${page}`, description: DESCRIPTIONS[page] },
      breadcrumbSchema(crumbs),
      ...(page === "about" ? [faqSchema(ABOUT_FAQS)] : []),
    ],
  });

  return (
    <div className="page-container" style={{ maxWidth: "1000px" }}>
      <Breadcrumbs items={crumbs} />

      {page === "about" && (
        <article className="card" style={articleStyle}>
          <div style={{ borderBottom: "1px solid var(--color-canvas-ceramic)", paddingBottom: "1.5rem", marginBottom: "2rem" }}>
            <span className="badge badge-gold" style={{ marginBottom: "0.75rem" }}>
              About EduHire Bridge
            </span>
            <h1 className="serif-headline" style={{ fontSize: "clamp(1.85rem, 5vw, 2.4rem)", color: "var(--color-brand-house)", marginBottom: "0.5rem" }}>
              Empowering India's Premier Educational Ecosystem
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem" }}>
              The dedicated hiring mediation and talent verification network for IIT-JEE, NEET, and school institutions.
            </p>
          </div>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 className="serif-headline" style={{ fontSize: "1.5rem", color: "var(--color-brand-green)", marginBottom: "1rem" }}>
              Our Mission
            </h2>
            <p style={{ marginBottom: "1rem" }}>
              EduHire Bridge was founded to bridge the critical gap between verified academic talent and progressive coaching institutions. In the competitive test preparation ecosystem of Kota, Delhi NCR, Hyderabad, and Bangalore, hiring the right faculty is pivotal to institutional success and student outcomes.
            </p>
            <p>
              Traditional recruitment channels often result in misaligned expectations, unverified qualifications, and prolonged hiring cycles. EduHire Bridge eliminates this friction through a rigorous credential verification framework, structured whiteboard demo evaluation rubrics, and automated applicant tracking.
            </p>
          </section>

          <section className="card-gold-wash" style={{ marginBottom: "2.5rem" }}>
            <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "1rem" }}>Why Choose EduHire Bridge?</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: "1.5rem" }}>
              <div>
                <h4 style={{ color: "var(--color-brand-house)", marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><ShieldCheck size={18} aria-hidden="true" /> 100% Verified Credentials</h4>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  Every educator profile undergoes direct document scrutiny, degree validation, and background KYC verification.
                </p>
              </div>
              <div>
                <h4 style={{ color: "var(--color-brand-house)", marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><Target size={18} aria-hidden="true" /> Domain-Specific Taxonomy</h4>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  Engineered specifically for IIT-JEE (Advanced/Main), NEET-UG, Olympiads, Foundation, and Board exams.
                </p>
              </div>
              <div>
                <h4 style={{ color: "var(--color-brand-house)", marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.4rem" }}><Zap size={18} aria-hidden="true" /> Direct Mediation & ATS</h4>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  End-to-end recruitment lifecycle management from vacancy posting to demo lecture scheduling.
                </p>
              </div>
            </div>
          </section>

          <section style={{ marginBottom: "2.5rem" }}>
            <h2 className="serif-headline" style={{ fontSize: "1.5rem", color: "var(--color-brand-green)", marginBottom: "1rem" }}>
              Quick Answers
            </h2>
            <Accordion items={ABOUT_FAQS} />
          </section>

          <section>
            <h2 className="serif-headline" style={{ fontSize: "1.5rem", color: "var(--color-brand-green)", marginBottom: "1rem" }}>
              Get Started
            </h2>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link to="/careers" className="btn btn-primary">
                Browse Teaching Vacancies
              </Link>
              <Link to="/faculty" className="btn btn-outline">
                Find Verified Faculty
              </Link>
              <Link to="/contact" className="btn btn-dark-outline">
                Talk to Our Team
              </Link>
            </div>
          </section>
        </article>
      )}

      {page === "contact" && <ContactSection />}

      {page === "privacy" && (
        <article className="card" style={articleStyle}>
          <span className="badge badge-role" style={{ marginBottom: "0.75rem" }}>
            Legal Document
          </span>
          <h1 className="serif-headline" style={{ fontSize: "2.2rem", color: "var(--color-brand-house)", marginBottom: "1.5rem" }}>
            Privacy Policy
          </h1>
          <p>EduHire Bridge values your privacy. This policy explains how we handle your educator and institutional data:</p>
          <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginTop: "1.5rem", marginBottom: "0.5rem" }}>1. Information Collected</h3>
          <p>We collect identity credentials, contact information, educational degrees, and demo recordings strictly for hiring verification.</p>
          <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginTop: "1.5rem", marginBottom: "0.5rem" }}>2. Data Masking</h3>
          <p>Teacher phone numbers and resumes are masked by default to prevent unsolicited contact and spam.</p>
          <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginTop: "1.5rem", marginBottom: "0.5rem" }}>3. Payments</h3>
          <p>Contact-unlock payments are processed by Razorpay. EduHire Bridge never sees or stores your card or UPI credentials.</p>
        </article>
      )}

      {page === "terms" && (
        <article className="card" style={articleStyle}>
          <span className="badge badge-role" style={{ marginBottom: "0.75rem" }}>
            Legal Document
          </span>
          <h1 className="serif-headline" style={{ fontSize: "2.2rem", color: "var(--color-brand-house)", marginBottom: "1.5rem" }}>
            Terms of Service
          </h1>
          <p>By using EduHire Bridge, institutes and educators agree to provide authentic information and conduct transparent hiring practices.</p>
        </article>
      )}

      {page === "disclaimer" && (
        <article className="card" style={articleStyle}>
          <span className="badge badge-role" style={{ marginBottom: "0.75rem" }}>
            Legal Document
          </span>
          <h1 className="serif-headline" style={{ fontSize: "2.2rem", color: "var(--color-brand-house)", marginBottom: "1.5rem" }}>
            Platform Disclaimer
          </h1>
          <p>
            EduHire Bridge acts as an academic hiring mediation and verification platform. While we rigorously verify candidate documents and coaching credentials, final employment offers and employment contracts are solely between the candidate and the hiring institution.
          </p>
        </article>
      )}
    </div>
  );
}
