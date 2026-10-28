import { Link, useParams } from "react-router";
import { GraduationCap, Lock, MapPin, Briefcase, Star, Check } from "lucide-react";
import { useFacultyProfile } from "../hooks/useFaculty";
import { TeacherAvatar } from "../components/TeacherCard";
import UnlockAction from "../components/UnlockAction";
import EmptyState from "@/shared/components/EmptyState";
import LoadingState from "@/shared/components/LoadingState";
import { useSeo } from "@/shared/seo/useSeo";
import { breadcrumbSchema, teacherProfileSchema } from "@/shared/seo/schema";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import { isVerifiedProfile } from "@/shared/utils/format";

const list = (value) => (Array.isArray(value) ? value.filter(Boolean).join(", ") : value);

export default function FacultyProfilePage() {
  const { id } = useParams();
  const { data: teacher, isLoading, isError } = useFacultyProfile(id);
  const crumbs = [{ name: "Home", path: "/" }, { name: "Faculty Directory", path: "/faculty" }, { name: teacher?.name || "Faculty Profile" }];
  useSeo({
    title: teacher ? `${teacher.name}${teacher.primary_subject ? ` — ${teacher.primary_subject} Faculty` : ""}${teacher.city ? `, ${teacher.city}` : ""}` : "Faculty Profile",
    description: teacher
      ? teacher.headline || teacher.bio || `${teacher.name} is a ${teacher.primary_subject || "subject"} educator${teacher.experience_years ? ` with ${teacher.experience_years}+ years of experience` : ""} on EduHire Bridge.`
      : undefined,
    path: `/faculty/${id}`,
    type: "profile",
    image: teacher?.profile_photo_url || undefined,
    noindex: isError,
    jsonLd: teacher ? [teacherProfileSchema(teacher), breadcrumbSchema(crumbs)] : null,
  });

  if (isLoading) return <LoadingState label="Opening profile..." />;

  if (isError || !teacher) {
    return (
      <div style={{ maxWidth: "600px", margin: "5rem auto", padding: "0 1.5rem" }}>
        <EmptyState
          icon={GraduationCap}
          title="Profile Not Available"
          action={
            <Link to="/faculty" className="btn btn-primary">
              Browse Faculty Directory
            </Link>
          }
        >
          This faculty profile is private or no longer active.
        </EmptyState>
      </div>
    );
  }

  const facts = [
    ["Primary Subject", teacher.primary_subject],
    ["Subjects", list(teacher.subjects)],
    ["Qualification", teacher.qualification],
    ["Experience", teacher.experience_years != null ? `${teacher.experience_years} years` : teacher.experience_range],
    ["Current Organization", teacher.current_organization],
    ["Exam Categories", list(teacher.exam_categories)],
    ["Classes Taught", list(teacher.classes_taught)],
    ["Teaching Mode", teacher.teaching_mode || list(teacher.work_modes)],
    ["Preferred Location", teacher.preferred_location || teacher.city],
    ["Expected CTC", teacher.expected_ctc],
    ["Languages", list(teacher.languages)],
    ["Availability", teacher.availability],
  ].filter(([, value]) => value);

  return (
    <article className="page-container" style={{ maxWidth: "1040px" }}>
      <Breadcrumbs items={crumbs} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="card" style={{ padding: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            <TeacherAvatar teacher={teacher} size={76} />
            <div>
              <h1 className="serif-headline" style={{ fontSize: "1.85rem", color: "var(--color-brand-house)" }}>
                {teacher.name}
              </h1>
              {teacher.headline && <p style={{ color: "var(--text-secondary)" }}>{teacher.headline}</p>}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                {teacher.primary_subject && <span className="badge badge-role">{teacher.primary_subject}</span>}
                {isVerifiedProfile(teacher) && <span className="badge badge-verified"><Check size={13} aria-hidden="true" /> Verified</span>}
                {teacher.premium_badge && <span className="badge badge-gold"><Star size={13} aria-hidden="true" /> Premium</span>}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
            {(teacher.city || teacher.preferred_location) && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <MapPin size={16} /> {teacher.city || teacher.preferred_location}
              </span>
            )}
            {teacher.experience_years != null && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <Briefcase size={16} /> {teacher.experience_years}+ years
              </span>
            )}
            {Number(teacher.rating) > 0 && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <Star size={16} color="var(--color-gold)" /> {Number(teacher.rating).toFixed(1)} ({teacher.ratings_count || 0})
              </span>
            )}
          </div>

          {teacher.bio && (
            <>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.75rem" }}>About</h2>
              <p style={{ whiteSpace: "pre-line", lineHeight: 1.75, marginBottom: "1.5rem" }}>{teacher.bio}</p>
            </>
          )}

          {facts.length > 0 && (
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2" style={{ fontSize: "0.92rem" }}>
              {facts.map(([label, value]) => (
                <div key={label} style={{ background: "var(--color-canvas-warm)", borderRadius: "8px", padding: "0.75rem 1rem" }}>
                  <dt style={{ color: "var(--text-secondary)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</dt>
                  <dd style={{ fontWeight: 600, margin: 0 }}>{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <aside>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: "1rem" }}>Contact & Resume</h3>
            <div
              style={{
                background: "var(--color-canvas-ceramic)",
                padding: "0.75rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
                display: "flex",
                gap: "0.5rem",
              }}
            >
              <Lock size={16} style={{ flexShrink: 0 }} /> Direct contact is masked to protect educators from spam. Institutes can unlock phone, email and resume.
            </div>
            <UnlockAction teacher={teacher} />
          </div>
        </aside>
      </div>
    </article>
  );
}
