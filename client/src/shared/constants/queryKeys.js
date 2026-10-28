// Central TanStack Query keys so mutations can invalidate the right caches.
export const queryKeys = {
  publicStats: ["public", "stats"],
  settings: ["public", "settings"],
  publicInstitutes: (filters = {}) => ["public", "institutes", filters],

  vacancies: (filters = {}) => ["vacancies", "active", filters],
  vacancy: (id) => ["vacancies", "detail", id],
  myVacancies: ["vacancies", "mine"],

  teachers: (filters = {}) => ["teachers", "public", filters],
  teacher: (id) => ["teachers", "detail", id],
  teacherPreferences: ["teachers", "me", "preferences"],

  myApplications: ["applications", "mine"],
  receivedApplications: ["applications", "received"],
  myInterviews: ["interviews", "mine"],
  myDocuments: ["documents", "mine"],

  talent: (filters = {}) => ["institute", "talent", filters],
  unlocked: ["institute", "unlocked"],

  notifications: ["notifications"],
  paymentConfig: ["payments", "config"],
  myPayments: ["payments", "mine"],

  blogPosts: (filters = {}) => ["blog", "published", filters],
  blogPost: (slug) => ["blog", "detail", slug],

  admin: {
    all: ["admin"],
    stats: ["admin", "stats"],
    teachers: ["admin", "teachers"],
    institutes: ["admin", "institutes"],
    vacancies: ["admin", "vacancies"],
    applications: ["admin", "applications"],
    payments: ["admin", "payments"],
    blog: ["admin", "blog"],
    inquiries: ["admin", "inquiries"],
    auditLogs: ["admin", "audit-logs"],
  },
};
