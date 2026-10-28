import { Link, useParams } from "react-router";
import { Briefcase, Building, MapPin, Calendar, GraduationCap, Flame } from "lucide-react";
import { useVacancy } from "../hooks/useVacancies";
import ApplyButton from "../components/ApplyButton";
import EmptyState from "@/shared/components/EmptyState";
import LoadingState from "@/shared/components/LoadingState";
import { useSeo } from "@/shared/seo/useSeo";
import { breadcrumbSchema, jobPostingSchema } from "@/shared/seo/schema";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import { formatDate } from "@/shared/utils/format";

export default function VacancyDetailPage() {
  const { id } = useParams();
  const { data: vacancy, isLoading, isError } = useVacancy(id);
  const crumbs = [{ name: "Home", path: "/" }, { name: "Careers", path: "/careers" }, { name: vacancy?.title || "Vacancy" }];
  useSeo({
    title: vacancy ? `${vacancy.title} — ${vacancy.institute_name}, ${vacancy.city}` : "Vacancy",
    description: vacancy
      ? vacancy.description || `${vacancy.subject} teaching vacancy at ${vacancy.institute_name}, ${vacancy.city}. Salary ${vacancy.salary_range}. Apply free on EduHire Bridge.`
      : undefined,
    path: `/careers/${id}`,
    noindex: isError,
    jsonLd: vacancy ? [jobPostingSchema(vacancy), breadcrumbSchema(crumbs)] : null,
  });

  if (isLoading) return <LoadingState label="Opening vacancy..." />;

  if (isError || !vacancy) {
    return (
      <div style={{ maxWidth: "600px", margin: "5rem auto", padding: "0 1.5rem" }}>
        <EmptyState
          icon={Briefcase}
          title="Vacancy Not Found"
          action={
            <Link to="/careers" className="btn btn-primary">
              Browse All Vacancies
            </Link>
          }
        >
          This vacancy is no longer available. It may have been filled or closed by the institute.
        </EmptyState>
      </div>
    );
  }

  const details = [
    ["Subject", vacancy.subject],
    ["Classes / Exams", Array.isArray(vacancy.classes) ? vacancy.classes.join(", ") : vacancy.classes],
    ["Board", vacancy.board],
    ["Salary Package", vacancy.salary_range],
    ["Min Experience", vacancy.min_experience],
    ["Employment Type", vacancy.type],
    ["Location", vacancy.location || vacancy.city],
  ].filter(([, value]) => value);

  return (
    <article className="page-container" style={{ maxWidth: "1040px" }}>
      <Breadcrumbs items={crumbs} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="card" style={{ padding: "2rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
            <span className="badge badge-role">{vacancy.subject}</span>
            {vacancy.urgency === "Urgent" && <span className="badge badge-rejected"><Flame size={13} aria-hidden="true" /> Urgent</span>}
            {vacancy.urgency === "High" && <span className="badge badge-gold">High Priority</span>}
          </div>
          <h1 className="serif-headline" style={{ fontSize: "2rem", color: "var(--color-brand-house)", lineHeight: 1.25, marginBottom: "1rem" }}>
            {vacancy.title}
          </h1>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <Building size={16} /> {vacancy.institute_name}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <MapPin size={16} /> {vacancy.city}
            </span>
            {vacancy.created_at && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <Calendar size={16} /> Posted {formatDate(vacancy.created_at)}
              </span>
            )}
          </div>

          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.75rem" }}>About this role</h2>
          {vacancy.description ? (
            <div style={{ whiteSpace: "pre-line", lineHeight: 1.75, color: "var(--text-primary)" }}>{vacancy.description}</div>
          ) : (
            <p style={{ color: "var(--text-secondary)" }}>The institute has not added a detailed description yet. Apply to start the conversation.</p>
          )}
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: "1rem" }}>Vacancy Details</h3>
            <dl style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt style={{ color: "var(--text-secondary)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</dt>
                  <dd style={{ fontWeight: 600, margin: 0 }}>{value}</dd>
                </div>
              ))}
            </dl>
            <ApplyButton vacancy={vacancy} />
          </div>

          <div className="card-gold-wash">
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <GraduationCap size={22} color="var(--color-brand-green)" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
                Complete profiles with a resume and demo video get shortlisted up to 4x faster.{" "}
                <Link to="/teacher/profile" style={{ color: "var(--color-brand-accent)", fontWeight: 600 }}>
                  Update profile
                </Link>
              </p>
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
