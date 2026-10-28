import { useState } from "react";
import { useSearchParams } from "react-router";
import { GraduationCap, Search, ShieldCheck } from "lucide-react";
import { usePublicFaculty } from "../hooks/useFaculty";
import TeacherCard from "../components/TeacherCard";
import UnlockAction from "../components/UnlockAction";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useSeo } from "@/shared/seo/useSeo";
import { breadcrumbSchema, itemListSchema } from "@/shared/seo/schema";
import Breadcrumbs from "@/shared/components/Breadcrumbs";

const CRUMBS = [{ name: "Home", path: "/" }, { name: "Faculty Directory", path: "/faculty" }];
import { SUBJECTS } from "@/shared/constants/options";
import { autoGrid } from "@/shared/utils/format";

/** Public faculty directory at /faculty (professional details only; contacts stay masked). */
export default function FacultyDirectoryPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") || "");
  const [city, setCity] = useState(params.get("city") || "");
  const subject = params.get("subject") || "";
  const verifiedOnly = params.get("verified") === "1";

  const query = usePublicFaculty({
    search: useDebouncedValue(search.trim()),
    city: useDebouncedValue(city.trim()),
    subject,
    verifiedOnly,
  });
  const teachers = query.data || [];

  useSeo({
    title: subject ? `Verified ${subject} Teachers & Faculty` : "Verified Faculty Directory — JEE, NEET & School Teachers",
    description:
      "Find KYC-verified Physics, Chemistry, Mathematics and Biology faculty for IIT-JEE, NEET and school coaching. Compare experience, qualifications and expected CTC, then unlock contact details.",
    path: "/faculty",
    jsonLd: [breadcrumbSchema(CRUMBS), itemListSchema("Verified faculty", teachers.map((t) => ({ name: t.name, path: `/faculty/${t.id}` })))],
  });

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <div className="page-container">
      <Breadcrumbs items={CRUMBS} />
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div className="badge badge-verified" style={{ marginBottom: "0.75rem" }}>
          <ShieldCheck size={13} aria-hidden="true" /> Verified Faculty Talent Pool
        </div>
        <h1 className="serif-headline" style={{ fontSize: "2.4rem", color: "var(--color-brand-house)", marginBottom: "0.75rem" }}>
          Find Screened Subject Specialists
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", maxWidth: "650px", margin: "0 auto" }}>
          Browse educator profiles across Physics, Chemistry, Mathematics and Biology. Contact details unlock for registered institutes.
        </p>
      </div>

      <div className="filter-bar" role="search">
        <div className="input-icon-wrap" style={{ flex: 2, minWidth: "220px" }}>
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            className="input-field"
            placeholder="Search by name or headline..."
            aria-label="Search faculty"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setParam("search", e.target.value.trim());
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: "150px" }}>
          <select className="input-select" style={{ width: "100%" }} aria-label="Subject" value={subject} onChange={(e) => setParam("subject", e.target.value)}>
            <option value="">All Subjects</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: "150px" }}>
          <input
            type="text"
            className="input-field"
            placeholder="Filter by city (e.g. Kota, Delhi)..."
            aria-label="City"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setParam("city", e.target.value.trim());
            }}
          />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}>
          <input type="checkbox" checked={verifiedOnly} onChange={(e) => setParam("verified", e.target.checked ? "1" : "")} />
          Verified only
        </label>
      </div>

      <QueryState query={query} loadingLabel="Loading faculty...">
        {teachers.length === 0 ? (
          <EmptyState icon={GraduationCap} title="No Faculty Found">
            No educator profiles currently match your filter selections.
          </EmptyState>
        ) : (
          <div style={autoGrid("320px")}>
            {teachers.map((t) => (
              <TeacherCard key={t.id} teacher={t} action={<UnlockAction teacher={t} />} />
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
