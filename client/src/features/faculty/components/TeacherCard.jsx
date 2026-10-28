import { memo } from "react";
import { Link } from "react-router";
import { Check, Star, MapPin, Briefcase } from "lucide-react";
import { initialOf, isVerifiedProfile } from "@/shared/utils/format";

export function TeacherAvatar({ teacher, size = 52 }) {
  const verified = isVerifiedProfile(teacher);
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          overflow: "hidden",
          background: "var(--color-brand-light)",
          color: "var(--color-brand-green)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: size > 50 ? "1.25rem" : "1.05rem",
        }}
      >
        {teacher.profile_photo_url ? (
          <img
            src={teacher.profile_photo_url}
            alt=""
            loading="lazy"
            decoding="async"
            width={size}
            height={size}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          initialOf(teacher.name, "T")
        )}
      </div>
      {verified && size >= 44 && (
        <span
          title="Verified"
          style={{
            position: "absolute",
            right: -2,
            bottom: -2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "var(--color-brand-accent)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid #fff",
          }}
        >
          <Check size={11} strokeWidth={3} aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

export const teacherSummary = (t) => {
  if (t.headline) return t.headline;
  if (t.bio) return t.bio;
  if (t.experience_years) return `Specialized faculty with ${t.experience_years}+ years of classroom coaching experience.`;
  return "";
};

/** Faculty card. `children` renders extra rows, `action` the bottom button. */
function TeacherCard({ teacher, action, children, showSummary = true }) {
  const summary = showSummary ? teacherSummary(teacher) : "";
  const location = teacher.city || teacher.preferred_location;
  return (
    <article className="card card-lift" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "1.1rem" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.9rem", marginBottom: "0.9rem" }}>
          <TeacherAvatar teacher={teacher} />
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <Link to={`/faculty/${teacher.id}`} style={{ color: "inherit" }} className="hover:underline">
                {teacher.name}
              </Link>
            </h3>
            {teacher.qualification && <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{teacher.qualification}</div>}
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.85rem" }}>
          <span className="badge badge-role">{teacher.primary_subject || teacher.subjects?.[0] || "Faculty"}</span>
          {isVerifiedProfile(teacher) && (
            <span className="badge badge-verified">
              <Check size={13} aria-hidden="true" /> Verified
            </span>
          )}
          {teacher.premium_badge && (
            <span className="badge badge-gold">
              <Star size={13} aria-hidden="true" /> Premium
            </span>
          )}
        </div>

        {(location || teacher.experience_years != null) && (
          <div style={{ display: "flex", gap: "0.35rem 1rem", flexWrap: "wrap", fontSize: "0.84rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
            {location && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                <MapPin size={14} aria-hidden="true" /> {location}
              </span>
            )}
            {teacher.experience_years != null && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                <Briefcase size={14} aria-hidden="true" /> {teacher.experience_years}+ yrs
              </span>
            )}
          </div>
        )}

        {summary && (
          <p
            style={{
              fontSize: "0.88rem",
              color: "var(--text-secondary)",
              lineHeight: 1.55,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {summary}
          </p>
        )}

        {children && <div style={{ marginTop: "0.9rem" }}>{children}</div>}
      </div>

      {action}
    </article>
  );
}

export default memo(TeacherCard);
