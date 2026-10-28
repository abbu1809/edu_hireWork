import { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Search,
  Briefcase,
  ArrowRight,
  Building,
  GraduationCap,
  ShieldCheck,
  Star,
  Video,
  Lock,
  BadgeCheck,
  MapPin,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { usePublicStats } from "@/features/site/hooks/useSite";
import { useActiveVacancies } from "@/features/vacancies/hooks/useVacancies";
import { usePublicFaculty } from "@/features/faculty/hooks/useFaculty";
import VacancyCard from "@/features/vacancies/components/VacancyCard";
import TeacherCard from "@/features/faculty/components/TeacherCard";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import Accordion from "@/shared/components/Accordion";
import HeroIllustration from "@/shared/components/illustrations/HeroIllustration";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useSeo } from "@/shared/seo/useSeo";
import { faqSchema, websiteSchema } from "@/shared/seo/schema";
import { ACADEMIC_LEVELS } from "@/shared/constants/options";
import { autoGrid, homePathForRole } from "@/shared/utils/format";

// Answer-first FAQ copy: also published as FAQPage structured data for answer engines.
const FAQS = [
  {
    q: "What is EduHire Bridge?",
    a: "EduHire Bridge is an Indian faculty-hiring platform that connects coaching institutes and schools with KYC-verified teachers for IIT-JEE, NEET, Foundation and K-12 roles. Institutes post vacancies and schedule demo lectures; teachers apply for free.",
  },
  {
    q: "How does EduHire Bridge verify teacher credentials?",
    a: "Our administrative team audits government ID proofs, university degrees, past teaching appointment letters, and conducts a preliminary video screening before awarding the Verified badge.",
  },
  {
    q: "How do coaching institutes schedule demo lectures?",
    a: "Institutes can shortlist candidate profiles and trigger an interview/demo request with date, time, and lecture topic. Both parties receive direct in-app schedules.",
  },
  {
    q: "Is candidate contact information public?",
    a: "No. In accordance with data privacy, personal mobile numbers and resumes are masked until an institute officially unlocks the candidate.",
  },
  {
    q: "Are there any fees for teachers to register and apply?",
    a: "Educator registration, profile creation, and job applications on EduHire Bridge are completely free for teachers.",
  },
];

const PILLARS = [
  {
    icon: BadgeCheck,
    title: "Verified, not just listed",
    text: "ID, degree and experience documents are reviewed before a profile earns the Verified badge.",
  },
  {
    icon: Video,
    title: "Demo-first hiring",
    text: "Shortlist applicants and schedule whiteboard demo lectures with date, time and meeting link.",
  },
  {
    icon: Lock,
    title: "Private by default",
    text: "Phone numbers and resumes stay masked until an institute unlocks the candidate.",
  },
];

const STEPS = [
  ["Post a vacancy", "Institutes publish subject, classes, salary and city in under two minutes."],
  ["Teachers apply free", "Verified educators apply in one click; recruiters track them in the ATS."],
  ["Run a demo lecture", "Schedule a whiteboard trial and share the meeting link instantly."],
  ["Unlock & hire", "Unlock direct contact and resume, then make the offer."],
];

const labelStyle = { fontSize: "0.76rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--text-secondary)" };

function StatTile({ value, fallback, label, gold }) {
  return (
    <div>
      <div className="stat-value" style={gold ? { color: "var(--color-gold)" } : undefined}>
        {typeof value === "number" && value > 0 ? `${value.toLocaleString("en-IN")}+` : fallback}
      </div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function LandingPage() {
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();

  useSeo({
    title: "JEE, NEET & School Faculty Hiring in India",
    description:
      "Hire KYC-verified IIT-JEE, NEET and school faculty or find coaching teaching jobs in Kota, Delhi NCR, Bangalore and across India. Demo lectures, ATS shortlists and direct offers.",
    path: "/",
    jsonLd: [websiteSchema(), faqSchema(FAQS)],
  });

  const [searchSubj, setSearchSubj] = useState("");
  const [searchLevel, setSearchLevel] = useState("");
  const [searchCity, setSearchCity] = useState("");

  const subject = useDebouncedValue(searchSubj.trim());
  const city = useDebouncedValue(searchCity.trim());

  const { data: stats } = usePublicStats();
  const vacanciesQuery = useActiveVacancies({ subject, city, level: searchLevel, limit: 6 });
  const facultyQuery = usePublicFaculty({ subject, city, limit: 6 });

  const vacancies = vacanciesQuery.data || [];
  const teachers = facultyQuery.data || [];

  const careersLink = `/careers?${new URLSearchParams(Object.entries({ subject, city, level: searchLevel }).filter(([, v]) => v)).toString()}`;

  return (
    <div>
      {/* 1. Hero — cream canvas, 60/40 split on desktop */}
      <section className="hero-warm-canvas" aria-labelledby="hero-title">
        <div className="hero-split">
          <div>
            <div className="hero-badge">
              <ShieldCheck size={16} aria-hidden="true" /> Verified Teacher-Institute Recruitment Platform
            </div>

            <h1 id="hero-title" className="hero-title">
              Connect <span className="highlight-green">Premier Institutes</span> with <span className="highlight-green">Qualified Faculties</span>
            </h1>

            <p className="hero-subtitle">
              EduHire Bridge is India's premier hiring mediator platform empowering coaching institutes, schools, and junior colleges across Kota, Delhi NCR, Bangalore, and across India to discover, screen, and recruit verified teaching talent.
            </p>

            <div className="hero-cta-row">
              <Link to="/auth?mode=signup&role=teacher" className="btn btn-primary btn-lg">
                <GraduationCap size={20} aria-hidden="true" /> Join as Teacher / Faculty
              </Link>
              <Link to="/auth?mode=signup&role=institute" className="btn btn-outline btn-lg">
                <Building size={20} aria-hidden="true" /> Post Vacancy as Institute
              </Link>
            </div>

            <div className="hero-trust">
              <span>
                <BadgeCheck size={16} aria-hidden="true" /> KYC-verified educators
              </span>
              <span>
                <Video size={16} aria-hidden="true" /> Demo lecture scheduling
              </span>
              <span>
                <Lock size={16} aria-hidden="true" /> Free for teachers
              </span>
            </div>
          </div>

          <div className="hero-visual">
            <HeroIllustration />
          </div>
        </div>

        {/* Search card */}
        <form
          className="card search-card"
          role="search"
          aria-label="Find teaching opportunities"
          onSubmit={(e) => {
            e.preventDefault();
            document.getElementById("vacancies-section")?.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(200px, 100%), 1fr))", gap: "1rem", alignItems: "flex-end" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="hero-subject" style={labelStyle}>
                Subject / Specialization
              </label>
              <div className="input-icon-wrap">
                <BookOpen size={17} aria-hidden="true" />
                <input
                  id="hero-subject"
                  type="text"
                  className="input-field"
                  placeholder="e.g. Physics, Chemistry, Maths"
                  value={searchSubj}
                  onChange={(e) => setSearchSubj(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="hero-level" style={labelStyle}>
                Target Exam / Level
              </label>
              <select id="hero-level" className="input-select" value={searchLevel} onChange={(e) => setSearchLevel(e.target.value)}>
                {ACADEMIC_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="hero-city" style={labelStyle}>
                Location / City
              </label>
              <div className="input-icon-wrap">
                <MapPin size={17} aria-hidden="true" />
                <input
                  id="hero-city"
                  type="text"
                  className="input-field"
                  placeholder="e.g. Kota, Delhi NCR, Bangalore"
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-black" style={{ width: "100%", minHeight: "46px" }}>
              <Search size={18} aria-hidden="true" /> Find Opportunities
            </button>
          </div>
        </form>
      </section>

      {/* 2. Live metrics */}
      <section className="stats-strip" aria-label="Platform statistics">
        <div className="stats-strip-grid">
          <StatTile value={stats?.teachers} fallback="Live" label="Registered Faculties" />
          <StatTile value={stats?.institutes} fallback="Live" label="Partner Institutes" />
          <StatTile value={stats?.vacancies} fallback="Active" label="Open Teaching Vacancies" />
          <div>
            <div className="stat-value" style={{ color: "var(--color-gold)" }}>
              100%
            </div>
            <div className="stat-label">KYC & Background Verified</div>
          </div>
        </div>
      </section>

      {/* 3. Vacancies */}
      <section id="vacancies-section" className="section" aria-labelledby="vacancies-heading">
        <div className="section-head-row">
          <div>
            <div className="badge badge-gold" style={{ marginBottom: "0.6rem" }}>
              <Star size={13} aria-hidden="true" /> High Urgency Openings
            </div>
            <h2 id="vacancies-heading" className="serif-headline" style={{ fontSize: "clamp(1.6rem, 1.3rem + 1.2vw, 2rem)", color: "var(--color-brand-house)" }}>
              Featured Coaching & School Vacancies
            </h2>
            <p style={{ color: "var(--text-secondary)", marginTop: "0.35rem" }}>Explore current requirements posted directly by verified institutions</p>
          </div>

          <Link to={careersLink} className="btn btn-outline">
            View All Vacancies <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <QueryState query={vacanciesQuery} loadingLabel="Loading vacancies...">
          {vacancies.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No Vacancies Available Currently"
              action={
                <Link to="/auth?mode=signup&role=institute" className="btn btn-primary">
                  Post Your First Vacancy
                </Link>
              }
            >
              Are you an institute administrator or school principal looking for top faculties? Post your requirement today to receive verified applications.
            </EmptyState>
          ) : (
            <div style={autoGrid("340px")}>
              {vacancies.map((vac) => (
                <VacancyCard
                  key={vac.id}
                  vacancy={vac}
                  action={
                    <button
                      className="btn btn-primary"
                      style={{ width: "100%" }}
                      onClick={() => navigate(currentUser ? (role === "teacher" ? "/teacher/jobs" : `/careers/${vac.id}`) : "/auth?mode=signup&role=teacher")}
                    >
                      Apply for Vacancy
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </QueryState>
      </section>

      {/* 4. Why EduHire — three pillars on white */}
      <section style={{ background: "var(--color-surface-white)" }} aria-labelledby="pillars-heading">
        <div className="section">
          <div className="section-heading">
            <h2 id="pillars-heading" className="serif-headline" style={{ fontSize: "clamp(1.6rem, 1.3rem + 1.2vw, 2rem)", color: "var(--color-brand-house)" }}>
              Hiring that respects everyone's time
            </h2>
            <p>Built for Indian coaching institutes and schools — and the educators they want to hire.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: "1.5rem" }}>
            {PILLARS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="card" style={{ boxShadow: "none", background: "var(--color-canvas-warm)" }}>
                <span className="icon-circle" style={{ marginBottom: "1rem" }}>
                  <Icon size={22} aria-hidden="true" />
                </span>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "0.4rem" }}>{title}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.94rem", lineHeight: 1.65 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. House Green feature band */}
      <section className="feature-band-house" aria-labelledby="trust-heading">
        <div className="feature-band-container">
          <div className="feature-band-content">
            <span className="badge badge-gold" style={{ marginBottom: "1rem" }}>
              Mediation & Quality Assurance
            </span>
            <h2 id="trust-heading" className="serif-headline">
              Why Institutes & Educators Trust EduHire Bridge
            </h2>
            <p>
              Traditional job boards are noisy and flooded with unverified resumes. EduHire Bridge acts as an active mediator, checking degrees, past track record, and conducting demo trial coordination.
            </p>

            <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap" }}>
              <Link to="/about" className="btn btn-white">
                Learn How It Works
              </Link>
              <Link to="/contact" className="btn btn-white-outline">
                Speak to a Mediator
              </Link>
            </div>
          </div>

          <div className="feature-panel">
            <h3 style={{ color: "var(--color-gold)", fontSize: "1.15rem", fontWeight: 700, marginBottom: "1.25rem" }}>How hiring works on EduHire</h3>
            <ol className="steps-list">
              {STEPS.map(([title, text]) => (
                <li key={title}>
                  <div>
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </div>
                </li>
              ))}
            </ol>
            <Link to={currentUser ? homePathForRole(role) : "/auth?mode=signup"} className="btn btn-white" style={{ marginTop: "1.5rem" }}>
              {currentUser ? "Open My Dashboard" : "Get Started Free"} <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Verified educators */}
      <section className="section" aria-labelledby="faculty-heading">
        <div className="section-heading">
          <div className="badge badge-verified" style={{ marginBottom: "0.6rem" }}>
            <ShieldCheck size={13} aria-hidden="true" /> Verified Faculty Talent Pool
          </div>
          <h2 id="faculty-heading" className="serif-headline" style={{ fontSize: "clamp(1.6rem, 1.3rem + 1.2vw, 2rem)", color: "var(--color-brand-house)" }}>
            Screened Subject Specialists Ready for Deployment
          </h2>
          <p>Connect with certified teachers across Physics, Chemistry, Mathematics, Biology, and foundational subjects</p>
        </div>

        <QueryState query={facultyQuery} loadingLabel="Loading faculty...">
          {teachers.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No Faculty Profiles Found Matching Filters"
              action={
                <Link to="/auth?mode=signup&role=teacher" className="btn btn-primary">
                  Register as Educator
                </Link>
              }
            >
              Are you an educator looking to teach at premier institutes? Create and verify your profile to get discovered by recruiters.
            </EmptyState>
          ) : (
            <>
              <div style={autoGrid("300px")}>
                {teachers.map((t) => (
                  <TeacherCard
                    key={t.id}
                    teacher={t}
                    action={
                      <Link
                        to={role === "institute" ? "/institute/talent" : currentUser ? `/faculty/${t.id}` : "/auth?mode=signup&role=institute"}
                        className="btn btn-outline"
                        style={{ width: "100%" }}
                      >
                        View Profile & Unlock
                      </Link>
                    }
                  />
                ))}
              </div>
              <div style={{ textAlign: "center", marginTop: "2rem" }}>
                <Link to="/faculty" className="btn btn-outline">
                  Browse Full Faculty Directory <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </>
          )}
        </QueryState>
      </section>

      {/* 7. FAQ — ceramic utility zone */}
      <section className="utility-zone-ceramic" aria-labelledby="faq-heading">
        <div style={{ maxWidth: "820px", margin: "0 auto" }}>
          <div className="section-heading">
            <h2 id="faq-heading" className="serif-headline" style={{ fontSize: "clamp(1.5rem, 1.25rem + 1vw, 1.85rem)", color: "var(--color-brand-house)" }}>
              Frequently Asked Questions
            </h2>
            <p>Clear answers on verification, mediator workflows, and hiring steps</p>
          </div>
          <Accordion items={FAQS} defaultOpen={0} />
        </div>
      </section>
    </div>
  );
}
