/**
 * Scores how complete a teacher profile is (0–100) and lists what is missing.
 * Same weighting the UI has always shown.
 */
export const calculateProfileCompletion = (teacher) => {
  if (!teacher) return { percent: 0, missingItems: [] };

  let score = 0;
  const missing = [];

  // 1. Basic profile (20%)
  if (teacher.name && teacher.name.trim().length > 1) score += 5;
  if (teacher.phone && teacher.phone.trim().length >= 10) score += 5;
  if (teacher.city || teacher.preferred_location) score += 5;
  if (teacher.profile_photo_url) score += 5;
  else missing.push("Upload profile photo");

  // 2. Professional identity (15%)
  if (teacher.primary_role) score += 5;
  if (teacher.headline && teacher.headline.trim().length > 5) score += 5;
  else missing.push("Add professional headline");
  if (teacher.bio && teacher.bio.trim().length > 10) score += 5;
  else missing.push("Write professional bio");

  // 3. Subject / expertise (15%)
  if (teacher.primary_subject || (teacher.subjects && teacher.subjects.length > 0)) score += 10;
  else missing.push("Select primary & secondary subjects");
  if (teacher.specialization || (teacher.subjects && teacher.subjects.length > 1)) score += 5;

  // 4. Experience (15%)
  if (teacher.experience_years !== undefined && teacher.experience_years !== null) score += 5;
  else if (teacher.experience_range) score += 5;
  if (teacher.current_organization || (teacher.work_history && teacher.work_history.length > 0)) score += 10;
  else missing.push("Add current organization or work history");

  // 5. Education (15%)
  if (teacher.qualification || (teacher.education_records && teacher.education_records.length > 0)) score += 15;
  else missing.push("Add educational degree records");

  // 6. Work preferences (10%)
  if (teacher.work_modes && teacher.work_modes.length > 0) score += 5;
  if (teacher.availability) score += 5;

  // 7. Resume (10%)
  if (teacher.resume_url) score += 10;
  else missing.push("Upload resume / CV");

  return { percent: Math.min(100, Math.max(15, score)), missingItems: missing };
};
