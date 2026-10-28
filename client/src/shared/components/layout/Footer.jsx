import { Link } from "react-router";
import { usePlatformSettings } from "@/features/site/hooks/useSite";
import NewsletterSignup from "@/features/site/components/NewsletterSignup";
import { GraduationCap, ShieldCheck, Star } from "lucide-react";

export default function Footer() {
  const { data: settings } = usePlatformSettings();
  const contactEmail = settings?.contact_email;

  return (
    <footer className="footer-dark-house">
      <div className="footer-container">
        <NewsletterSignup />
        <div className="footer-grid">
          {/* Col 1: Brand & Identity */}
          <div className="footer-col">
            <Link to="/" style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <div className="brand-symbol" style={{ width: "34px", height: "34px", fontSize: "1.1rem" }}>
                <GraduationCap size={18} aria-hidden="true" />
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--color-surface-white)" }}>
                EduHire <span style={{ color: "var(--color-gold)" }}>Bridge</span>
              </div>
            </Link>
            <p style={{ color: "var(--text-on-dark-muted)", fontSize: "0.9rem", lineHeight: "1.6", maxWidth: "340px", marginBottom: "1.25rem" }}>
              The verified faculty and coaching recruitment platform. Connecting premier IIT-JEE, NEET, and school institutions with checked subject specialists across Kota, Delhi NCR, Bangalore, and nationwide.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <span className="badge badge-verified"><ShieldCheck size={13} aria-hidden="true" /> 100% KYC Verified</span>
              <span className="badge badge-gold"><Star size={13} aria-hidden="true" /> Premium Educators</span>
            </div>
          </div>

          {/* Col 2: For Institutes */}
          <div className="footer-col">
            <h4>For Institutes</h4>
            <ul>
              <li><Link to="/institute/vacancies">Post Vacancy</Link></li>
              <li><Link to="/faculty">Search Verified Faculty</Link></li>
              <li><Link to="/institute/applicants">Applicant ATS Pipeline</Link></li>
              <li><Link to="/institute-updates">Institute Recruiter Hub</Link></li>
            </ul>
          </div>

          {/* Col 3: For Teachers */}
          <div className="footer-col">
            <h4>For Teachers</h4>
            <ul>
              <li><Link to="/careers">Browse Teaching Vacancies</Link></li>
              <li><Link to="/teacher/profile">Complete Faculty Profile</Link></li>
              <li><Link to="/teacher/applications">My Applications Tracker</Link></li>
              <li><Link to="/teacher-updates">Learn & Grow (Career Guides)</Link></li>
            </ul>
          </div>

          {/* Col 4: Platform & Legal */}
          <div className="footer-col">
            <h4>Platform & Legal</h4>
            <ul>
              <li><Link to="/about">About EduHire Bridge</Link></li>
              <li><Link to="/institutes">Partner Institutes</Link></li>
              <li><Link to="/blog">Educational Blog</Link></li>
              <li><Link to="/contact">Contact Support</Link></li>
              <li><Link to="/privacy">Privacy Policy</Link></li>
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/disclaimer">Disclaimer Notice</Link></li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom Bar */}
        <div className="footer-bottom">
          <div>© {new Date().getFullYear()} EduHire Bridge. All rights reserved. Regional Hubs: Kota · Delhi NCR · Bangalore · Hyderabad.</div>
          <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
            <Link to="/privacy">Privacy Policy</Link>
            <span>•</span>
            <Link to="/terms">Terms of Service</Link>
            <span>•</span>
            <Link to="/disclaimer">Disclaimer</Link>
            {contactEmail && (
              <>
                <span>•</span>
                <a href={`mailto:${contactEmail}`} style={{ color: "var(--color-gold)" }}>
                  {contactEmail}
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
