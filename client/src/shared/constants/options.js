// Fixed choice lists used by forms and filters (UI vocabulary, not records).

export const SUBJECTS = ["Physics", "Chemistry", "Mathematics", "Biology"];

export const SIGNUP_SUBJECTS = [
  { value: "Physics", label: "Physics" },
  { value: "Chemistry", label: "Chemistry" },
  { value: "Mathematics", label: "Mathematics" },
  { value: "Biology", label: "Biology (Botany/Zoology)" },
  { value: "English", label: "English" },
  { value: "Social Science", label: "Social Science" },
];

export const ACADEMIC_LEVELS = [
  { value: "", label: "All Academic Levels" },
  { value: "IIT-JEE", label: "IIT-JEE (Main / Advanced)" },
  { value: "NEET", label: "NEET-UG Medical" },
  { value: "Foundation", label: "Foundation / Olympiads (9th-10th)" },
  { value: "K-12", label: "K-12 Board / Senior Secondary" },
];

export const URGENCY_OPTIONS = [
  { value: "Normal", label: "Normal" },
  { value: "High", label: "High" },
  { value: "Urgent", label: "Urgent (Immediate Joining)" },
];

export const APPLICATION_STATUS_OPTIONS = [
  { value: "APPLIED", label: "Applied" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "INTERVIEW", label: "Interview / Demo" },
  { value: "SELECTED", label: "Selected" },
  { value: "REJECTED", label: "Rejected" },
];

export const APPLICATION_STATUS_ORDER = {
  APPLIED: 0,
  UNDER_REVIEW: 1,
  SHORTLISTED: 2,
  INTERVIEW: 3,
  SELECTED: 4,
  REJECTED: 4,
  WITHDRAWN: 4,
};

export const TERMINAL_APPLICATION_STATUSES = ["SELECTED", "REJECTED", "WITHDRAWN"];

export const isTerminalApplicationStatus = (status) =>
  TERMINAL_APPLICATION_STATUSES.includes(status);

export const canTransitionApplicationStatus = (fromStatus, toStatus) => {
  const from = fromStatus || "APPLIED";
  if (from === toStatus) return false;
  if (isTerminalApplicationStatus(from)) return false;
  if (toStatus === "REJECTED") return true;
  const fromRank = APPLICATION_STATUS_ORDER[from];
  const toRank = APPLICATION_STATUS_ORDER[toStatus];
  if (fromRank === undefined || toRank === undefined) return false;
  return toRank > fromRank;
};

export const CONTENT_STREAMS = [
  { id: "TEACHER_UPDATE", slug: "teacher-updates", label: "Teacher Updates", icon: "GraduationCap" },
  { id: "INSTITUTE_UPDATE", slug: "institute-updates", label: "Institute Recruiter Hub", icon: "School" },
  { id: "BLOG", slug: "blog", label: "Educational Blog", icon: "Newspaper" },
  { id: "ALL", slug: "all", label: "All Topics", icon: "LayoutGrid" },
];

export const STREAM_LABELS = {
  TEACHER_UPDATE: "Teacher Update",
  INSTITUTE_UPDATE: "Institute Update",
  BLOG: "Blog",
};

export const applicationBadgeClass = (status) => {
  if (status === "SELECTED") return "badge-verified";
  if (status === "INTERVIEW") return "badge-gold";
  if (status === "REJECTED" || status === "WITHDRAWN") return "badge-rejected";
  return "badge-role";
};
