import { useState } from "react";
import { Users, Phone, Mail, Lock } from "lucide-react";
import { useTalentPool } from "../hooks/useInstitute";
import TeacherCard from "@/features/faculty/components/TeacherCard";
import UnlockAction from "@/features/faculty/components/UnlockAction";
import { DashboardHeader } from "@/shared/components/layout/DashboardLayout";
import EmptyState from "@/shared/components/EmptyState";
import QueryState from "@/shared/components/QueryState";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { SUBJECTS } from "@/shared/constants/options";
import { autoGrid } from "@/shared/utils/format";

export default function InstituteTalentPage() {
  useDocumentTitle("Talent Discovery");
  const [subject, setSubject] = useState("");
  const [city, setCity] = useState("");
  const query = useTalentPool({ subject, city: useDebouncedValue(city.trim()) });
  const teachers = query.data?.teachers || [];

  return (
    <div>
      <DashboardHeader title="Faculty Talent Pool Discovery" subtitle="Search and inspect verified educators across Physics, Chemistry, Maths, and Biology" />

      <div className="filter-bar" role="search">
        <div style={{ flex: 1, minWidth: "160px" }}>
          <select className="input-select" style={{ width: "100%" }} aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">All Subjects</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: "160px" }}>
          <input
            type="text"
            className="input-field"
            placeholder="Filter by city (e.g. Kota, Delhi)..."
            aria-label="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
      </div>

      <QueryState query={query} loadingLabel="Loading talent pool...">
        {teachers.length === 0 ? (
          <EmptyState icon={Users} title="No Faculty Found">
            No educator profiles currently match your filter selections.
          </EmptyState>
        ) : (
          <div style={autoGrid("340px")}>
            {teachers.map((teacher) => (
              <TeacherCard key={teacher.id} teacher={teacher} showSummary={false} action={<UnlockAction teacher={teacher} isUnlocked={teacher.is_unlocked} />}>
                <div style={{ background: "var(--color-canvas-warm)", padding: "0.75rem", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
                  <div>
                    <strong>Experience:</strong> {teacher.experience_years != null ? `${teacher.experience_years}+ Years` : "Not specified"}
                  </div>
                  <div>
                    <strong>Location:</strong> {teacher.city || teacher.preferred_location || "Not specified"}
                  </div>
                  <div>
                    <strong>Expected CTC:</strong> {teacher.expected_ctc || "Not specified"}
                  </div>
                </div>

                {teacher.is_unlocked ? (
                  <div style={{ background: "var(--color-success-bg)", padding: "0.75rem", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "1rem", wordBreak: "break-all" }}>
                    <div>
                      <Phone size={14} /> <strong>Phone:</strong> {teacher.phone ? <a href={`tel:${teacher.phone}`}>{teacher.phone}</a> : "Not provided"}
                    </div>
                    <div>
                      <Mail size={14} /> <strong>Email:</strong> <a href={`mailto:${teacher.email}`}>{teacher.email}</a>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: "var(--color-canvas-ceramic)",
                      padding: "0.6rem 0.75rem",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      color: "var(--text-secondary)",
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <Lock size={14} /> Direct contact masked. Unlock to view phone & resume.
                  </div>
                )}
              </TeacherCard>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
