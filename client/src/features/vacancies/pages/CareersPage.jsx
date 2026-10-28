import { useState } from "react";
import { useSearchParams } from "react-router";
import { Briefcase, Search } from "lucide-react";
import { useActiveVacancies } from "../hooks/useVacancies";
import VacancyCard from "../components/VacancyCard";
import ApplyButton from "../components/ApplyButton";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useSeo } from "@/shared/seo/useSeo";
import { breadcrumbSchema, itemListSchema } from "@/shared/seo/schema";
import Breadcrumbs from "@/shared/components/Breadcrumbs";

const CRUMBS = [{ name: "Home", path: "/" }, { name: "Careers", path: "/careers" }];
import { ACADEMIC_LEVELS, SUBJECTS, URGENCY_OPTIONS } from "@/shared/constants/options";
import { autoGrid } from "@/shared/utils/format";

/** Public job board at /careers. Filters live in the URL so results can be shared. */
export default function CareersPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") || "");
  const [city, setCity] = useState(params.get("city") || "");
  const subject = params.get("subject") || "";
  const level = params.get("level") || "";
  const urgency = params.get("urgency") || "";

  const debouncedSearch = useDebouncedValue(search.trim());
  const debouncedCity = useDebouncedValue(city.trim());

  const query = useActiveVacancies({ search: debouncedSearch, city: debouncedCity, subject, level, urgency });
  const vacancies = query.data || [];

  useSeo({
    title: subject ? `${subject} Teaching Jobs${debouncedCity ? ` in ${debouncedCity}` : ""}` : "Teaching Jobs & Faculty Vacancies in India",
    description:
      "Browse verified IIT-JEE, NEET, Foundation and school teaching vacancies from coaching institutes across Kota, Delhi NCR, Bangalore and India. Filter by subject, level, city and urgency and apply free.",
    path: "/careers",
    jsonLd: [breadcrumbSchema(CRUMBS), itemListSchema("Teaching vacancies", vacancies.map((v) => ({ name: v.title, path: `/careers/${v.id}` })))],
  });

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearch("");
    setCity("");
    setParams({}, { replace: true });
  };

  return (
    <div className="page-container">
      <Breadcrumbs items={CRUMBS} />
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <div className="badge badge-gold" style={{ marginBottom: "0.75rem" }}>
          <Briefcase size={13} aria-hidden="true" /> Careers at Verified Institutes
        </div>
        <h1 className="serif-headline" style={{ fontSize: "2.4rem", color: "var(--color-brand-house)", marginBottom: "0.75rem" }}>
          Coaching & School Teaching Vacancies
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", maxWidth: "650px", margin: "0 auto" }}>
          Verified openings from accredited IIT-JEE, NEET, and CBSE coaching centers and schools across India.
        </p>
      </div>

      {/* Search & Filter Strip */}
      <div className="filter-bar" role="search">
        <div className="input-icon-wrap" style={{ flex: 2, minWidth: "220px" }}>
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            className="input-field"
            placeholder="Search vacancy or institute name..."
            aria-label="Search vacancies"
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
          <select className="input-select" style={{ width: "100%" }} aria-label="Academic level" value={level} onChange={(e) => setParam("level", e.target.value)}>
            {ACADEMIC_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: "150px" }}>
          <input
            type="text"
            className="input-field"
            placeholder="City (e.g. Kota)"
            aria-label="City"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setParam("city", e.target.value.trim());
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: "140px" }}>
          <select className="input-select" style={{ width: "100%" }} aria-label="Urgency" value={urgency} onChange={(e) => setParam("urgency", e.target.value)}>
            <option value="">Any Urgency</option>
            {URGENCY_OPTIONS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!query.isLoading && !query.isError && (
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
          {vacancies.length} open {vacancies.length === 1 ? "vacancy" : "vacancies"}
          {query.isFetching && " · updating…"}
        </p>
      )}

      <QueryState query={query} loadingLabel="Loading vacancies...">
        {vacancies.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No Vacancies Matching Your Filters"
            action={
              <button className="btn btn-outline" onClick={clearFilters}>
                Clear Filters
              </button>
            }
          >
            Try clearing your search query or check back later as new institute requirements are posted daily.
          </EmptyState>
        ) : (
          <div style={autoGrid("340px")}>
            {vacancies.map((vac) => (
              <VacancyCard key={vac.id} vacancy={vac} action={<ApplyButton vacancy={vac} />} />
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
