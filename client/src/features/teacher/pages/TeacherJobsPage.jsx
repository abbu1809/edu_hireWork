import { useState } from "react";
import { Briefcase } from "lucide-react";
import { useActiveVacancies } from "@/features/vacancies/hooks/useVacancies";
import VacancyCard from "@/features/vacancies/components/VacancyCard";
import ApplyButton from "@/features/vacancies/components/ApplyButton";
import { DashboardHeader } from "@/shared/components/layout/DashboardLayout";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { SUBJECTS } from "@/shared/constants/options";
import { autoGrid } from "@/shared/utils/format";

export default function TeacherJobsPage() {
  useDocumentTitle("Explore Vacancies");
  const [jobSearch, setJobSearch] = useState("");
  const [jobSubjFilter, setJobSubjFilter] = useState("");
  const query = useActiveVacancies({ search: useDebouncedValue(jobSearch.trim()), subject: jobSubjFilter });
  const vacancies = query.data || [];

  return (
    <div>
      <DashboardHeader title="Explore Teaching Vacancies" subtitle="Verified openings from accredited IIT-JEE, NEET, and CBSE coaching centers" />

      <div className="filter-bar" role="search">
        <div style={{ flex: 2, minWidth: "220px" }}>
          <input
            type="search"
            className="input-field"
            placeholder="Search vacancy or institute name..."
            aria-label="Search vacancies"
            value={jobSearch}
            onChange={(e) => setJobSearch(e.target.value)}
          />
        </div>
        <div style={{ flex: 1, minWidth: "160px" }}>
          <select className="input-select" style={{ width: "100%" }} aria-label="Subject" value={jobSubjFilter} onChange={(e) => setJobSubjFilter(e.target.value)}>
            <option value="">All Subjects</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <QueryState query={query} loadingLabel="Loading vacancies...">
        {vacancies.length === 0 ? (
          <EmptyState icon={Briefcase} title="No Vacancies Matching Your Filters">
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
