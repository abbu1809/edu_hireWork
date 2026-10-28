import { Link } from "react-router";
import { Building, MapPin, Users, Globe, School, Check, Star } from "lucide-react";
import { usePublicInstitutes } from "../hooks/useSite";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import { useSeo } from "@/shared/seo/useSeo";
import { breadcrumbSchema } from "@/shared/seo/schema";
import Breadcrumbs from "@/shared/components/Breadcrumbs";

const CRUMBS = [{ name: "Home", path: "/" }, { name: "Partner Institutes", path: "/institutes" }];
import { autoGrid, initialOf, isVerifiedProfile } from "@/shared/utils/format";

/** Public list of partner institutes at /institutes. */
export default function InstitutesPage() {
  const query = usePublicInstitutes();
  const institutes = query.data || [];

  useSeo({
    title: "Partner Coaching Institutes & Schools",
    description: "Coaching institutes and schools across India hiring verified IIT-JEE, NEET and K-12 faculty through EduHire Bridge.",
    path: "/institutes",
    jsonLd: breadcrumbSchema(CRUMBS),
  });

  return (
    <div className="page-container">
      <Breadcrumbs items={CRUMBS} />
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div className="badge badge-gold" style={{ marginBottom: "0.75rem" }}>
          <School size={13} aria-hidden="true" /> Partner Network
        </div>
        <h1 className="serif-headline" style={{ fontSize: "2.4rem", color: "var(--color-brand-house)", marginBottom: "0.75rem" }}>
          Coaching Institutes & Schools Hiring on EduHire
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", maxWidth: "650px", margin: "0 auto" }}>
          Institutions recruiting verified faculty through EduHire Bridge.
        </p>
      </div>

      <QueryState query={query} loadingLabel="Loading institutes...">
        {institutes.length === 0 ? (
          <EmptyState
            icon={Building}
            title="No Partner Institutes Listed Yet"
            action={
              <Link to="/auth?mode=signup&role=institute" className="btn btn-primary">
                Register Your Institute
              </Link>
            }
          >
            Be the first institution to post vacancies and hire verified faculty.
          </EmptyState>
        ) : (
          <div style={autoGrid("320px")}>
            {institutes.map((inst) => (
              <div key={inst.id} className="card">
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                  <div
                    style={{
                      width: "50px",
                      height: "50px",
                      flexShrink: 0,
                      borderRadius: "50%",
                      background: "var(--color-brand-house)",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "1.2rem",
                    }}
                  >
                    {initialOf(inst.institute_name, "I")}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>{inst.institute_name}</h3>
                    {inst.institute_type && <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>{inst.institute_type}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                  {isVerifiedProfile(inst) && <span className="badge badge-verified"><Check size={13} aria-hidden="true" /> Verified</span>}
                  {inst.featured_on_homepage && <span className="badge badge-gold"><Star size={13} aria-hidden="true" /> Featured</span>}
                </div>
                {inst.tagline && <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>{inst.tagline}</p>}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {(inst.city || inst.location) && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                      <MapPin size={14} /> {inst.location || inst.city}
                    </span>
                  )}
                  {inst.student_count && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                      <Users size={14} /> {inst.student_count} students
                    </span>
                  )}
                  {inst.website && (
                    <a
                      href={/^https?:\/\//.test(inst.website) ? inst.website : `https://${inst.website}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", color: "var(--color-brand-accent)" }}
                    >
                      <Globe size={14} /> Website
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
