import { memo } from "react";
import { Link } from "react-router";
import { Building, MapPin, Flame, Star, IndianRupee, Clock } from "lucide-react";
import { formatDate } from "@/shared/utils/format";

/** Vacancy card. `action` is the button/link at the bottom. */
function VacancyCard({ vacancy, action, linkTitle = true }) {
  const title = linkTitle ? (
    <Link to={`/careers/${vacancy.id}`} style={{ color: "inherit" }} className="hover:underline">
      {vacancy.title}
    </Link>
  ) : (
    vacancy.title
  );

  return (
    <article className="card card-lift" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "1.1rem" }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", gap: "0.5rem", flexWrap: "wrap" }}>
          <span className="badge badge-role">{vacancy.subject || "All Subjects"}</span>
          {vacancy.urgency === "Urgent" && (
            <span className="badge badge-rejected">
              <Flame size={13} aria-hidden="true" /> Urgent
            </span>
          )}
          {vacancy.urgency === "High" && (
            <span className="badge badge-gold">
              <Star size={13} aria-hidden="true" /> High Priority
            </span>
          )}
        </div>

        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-brand-house)", marginBottom: "0.5rem", lineHeight: 1.35 }}>{title}</h3>

        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem 0.9rem", color: "var(--text-secondary)", fontSize: "0.87rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", minWidth: 0 }}>
            <Building size={15} aria-hidden="true" style={{ flexShrink: 0 }} /> {vacancy.institute_name}
          </span>
          {vacancy.city && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <MapPin size={15} aria-hidden="true" /> {vacancy.city}
            </span>
          )}
        </div>

        <dl className="info-panel">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <IndianRupee size={15} color="var(--color-brand-accent)" aria-hidden="true" />
            <dt className="sr-only">Salary package</dt>
            <dd style={{ margin: 0, fontWeight: 600 }}>{vacancy.salary_range || "Negotiable"}</dd>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Clock size={15} color="var(--color-brand-accent)" aria-hidden="true" />
            <dt className="sr-only">Minimum experience</dt>
            <dd style={{ margin: 0 }}>{vacancy.min_experience ? `${vacancy.min_experience} experience` : "Experience not specified"}</dd>
          </div>
        </dl>

        {vacancy.created_at && (
          <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", marginTop: "0.65rem" }}>Posted {formatDate(vacancy.created_at)}</div>
        )}
      </div>

      {action}
    </article>
  );
}

// Memoized: list pages re-render on every filter keystroke; unchanged cards are skipped.
export default memo(VacancyCard);
