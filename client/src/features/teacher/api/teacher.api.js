import { http, unwrap } from "@/shared/api/httpClient";

export const teacherApi = {
  updateProfile: (payload) => unwrap(http.put("/teachers/me", payload)),
  getPreferences: () => unwrap(http.get("/teachers/me/preferences")),
  updatePreferences: (payload) => unwrap(http.put("/teachers/me/preferences", payload)),

  myApplications: () => unwrap(http.get("/applications/mine")),
  apply: (vacancyId) => unwrap(http.post("/applications", { vacancyId })),
  withdraw: (id) => unwrap(http.patch(`/applications/${id}/withdraw`)),

  myInterviews: () => unwrap(http.get("/interviews/mine")),

  myDocuments: () => unwrap(http.get("/documents")),
  uploadDocument: ({ file, documentType }) => {
    const form = new FormData();
    form.append("file", file);
    form.append("documentType", documentType);
    return unwrap(http.post("/documents", form, { timeout: 120000 }));
  },
  documentUrl: (id) => unwrap(http.get(`/documents/${id}/url`)),
  myResumeUrl: () => unwrap(http.get("/documents/resume/url")),
  deleteDocument: (id) => http.delete(`/documents/${id}`),
};
