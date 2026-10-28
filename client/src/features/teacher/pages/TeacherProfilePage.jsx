import { useEffect, useState } from "react";
import { ShieldCheck, Upload, FileText, Trash2, ExternalLink, Camera } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { teacherApi } from "../api/teacher.api";
import { useDeleteDocument, useMyDocuments, useUpdateTeacherProfile, useUploadDocument } from "../hooks/useTeacher";
import { DashboardHeader } from "@/shared/components/layout/DashboardLayout";
import QueryState from "@/shared/components/QueryState";
import { useDocumentTitle } from "@/shared/hooks/useDocumentTitle";
import { notify } from "@/shared/utils/notify";
import { useConfirm } from "@/shared/components/ConfirmDialog";
import { formatDate, initialOf, isVerifiedProfile } from "@/shared/utils/format";
import { SUBJECTS } from "@/shared/constants/options";

const MAX_BYTES = 10 * 1024 * 1024;

const DOC_LABELS = {
  RESUME: "Resume",
  KYC: "KYC / ID Proof",
  CERTIFICATE: "Degree / Certificate",
  EXPERIENCE_LETTER: "Experience Letter",
  PORTFOLIO: "Portfolio",
  PHOTO: "Profile Photo",
};

const toForm = (user) => ({
  name: user?.name || "",
  phone: user?.phone || "",
  primary_subject: user?.primary_subject || user?.subjects?.[0] || "",
  qualification: user?.qualification || "",
  experience_years: user?.experience_years ?? "",
  city: user?.city || "",
  headline: user?.headline || "",
  expected_ctc: user?.expected_ctc || "",
  demo_video_url: user?.demo_video_url || "",
  bio: user?.bio || "",
});

function UploadButton({ label, accept, documentType, uploadingType, onUpload, variant = "btn-outline", icon: Icon = Upload }) {
  const busy = uploadingType === documentType;
  return (
    <label className={`btn ${variant}`} style={{ width: "100%", cursor: busy ? "wait" : "pointer", display: "flex", justifyContent: "center" }}>
      <Icon size={16} /> {busy ? "Uploading to Secure Storage..." : label}
      <input
        type="file"
        accept={accept}
        style={{ display: "none" }}
        disabled={Boolean(uploadingType)}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onUpload(file, documentType);
        }}
      />
    </label>
  );
}

export default function TeacherProfilePage() {
  useDocumentTitle("Profile & KYC");
  const { currentUser } = useAuth();
  const [profileForm, setProfileForm] = useState(() => toForm(currentUser));
  const updateProfile = useUpdateTeacherProfile();
  const upload = useUploadDocument();
  const deleteDoc = useDeleteDocument();
  const documentsQuery = useMyDocuments();
  const confirm = useConfirm();

  // Refill the form when the session user loads or changes.
  useEffect(() => {
    setProfileForm(toForm(currentUser));
  }, [currentUser?.id, currentUser?.updated_at]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (field) => (e) => setProfileForm({ ...profileForm, [field]: e.target.value });

  const handleProfileSave = (e) => {
    e.preventDefault();
    if (profileForm.name.trim().length < 2) return notify.error("Please enter your full name.");
    const payload = { ...profileForm, experience_years: profileForm.experience_years === "" ? undefined : Number(profileForm.experience_years) };
    if (!payload.primary_subject) delete payload.primary_subject;
    updateProfile.mutate(payload, {
      onSuccess: () => notify.success("Faculty profile updated successfully."),
      onError: (error) => notify.apiError(error, "Failed to update profile."),
    });
  };

  const handleUpload = (file, documentType) => {
    if (file.size > MAX_BYTES) return notify.error("File size exceeds 10MB limit.");
    upload.mutate(
      { file, documentType },
      {
        onSuccess: () =>
          notify.success(
            documentType === "RESUME"
              ? "Resume uploaded and synced with your verified profile."
              : documentType === "PHOTO"
                ? "Profile photo updated."
                : `${DOC_LABELS[documentType]} uploaded. Our team will review it within 24-48 hours.`
          ),
        onError: (error) => notify.apiError(error, "Upload failed."),
      }
    );
  };

  const openDocument = async (doc) => {
    // Open the tab synchronously so pop-up blockers allow it, then point it at the signed URL.
    const tab = window.open("", "_blank");
    if (tab) tab.opener = null;
    try {
      const { url } = doc === "resume" ? await teacherApi.myResumeUrl() : await teacherApi.documentUrl(doc.id);
      if (tab) tab.location.href = url;
      else window.location.assign(url);
    } catch (error) {
      tab?.close();
      notify.apiError(error, "Could not open this file.");
    }
  };

  const handleDelete = async (doc) => {
    const ok = await confirm({
      title: "Remove document?",
      message: `"${doc.name}" will be deleted from secure storage. You can upload it again later.`,
      confirmLabel: "Remove",
      tone: "danger",
    });
    if (!ok) return;
    deleteDoc.mutate(doc.id, {
      onSuccess: () => notify.info("Document removed successfully."),
      onError: (error) => notify.apiError(error, "Failed to delete document."),
    });
  };

  const verified = isVerifiedProfile(currentUser);
  const uploadingType = upload.isPending ? upload.variables?.documentType : null;
  const documents = (documentsQuery.data || []).filter((d) => d.document_type !== "PHOTO");

  return (
    <div>
      <DashboardHeader title="Faculty Profile & KYC Documents" subtitle="Manage your verified educator credentials and resume documents" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: Edit Profile Form */}
        <div className="card">
          <h3 className="card-title" style={{ marginBottom: "1.25rem" }}>
            Professional Information
          </h3>
          <form onSubmit={handleProfileSave}>
            <div className="form-group">
              <label className="form-label" htmlFor="tp-name">
                Full Name
              </label>
              <input id="tp-name" type="text" className="input-field" autoComplete="name" value={profileForm.name} onChange={set("name")} />
            </div>

            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <div className="form-group">
                <label className="form-label" htmlFor="tp-phone">
                  Mobile Number
                </label>
                <input id="tp-phone" type="tel" className="input-field" autoComplete="tel" value={profileForm.phone} onChange={set("phone")} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="tp-city">
                  City
                </label>
                <input id="tp-city" type="text" className="input-field" autoComplete="address-level2" value={profileForm.city} onChange={set("city")} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tp-headline">
                Professional Headline
              </label>
              <input
                id="tp-headline"
                type="text"
                className="input-field"
                placeholder="e.g. IIT-JEE Physics Faculty · 8 yrs at Kota coaching"
                value={profileForm.headline}
                onChange={set("headline")}
              />
            </div>

            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <div className="form-group">
                <label className="form-label" htmlFor="tp-subject">
                  Primary Subject
                </label>
                <select id="tp-subject" className="input-select" style={{ width: "100%" }} value={profileForm.primary_subject} onChange={set("primary_subject")}>
                  <option value="">Select subject</option>
                  {[...new Set([...SUBJECTS, profileForm.primary_subject].filter(Boolean))].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="tp-exp">
                  Teaching Experience (Years)
                </label>
                <input
                  id="tp-exp"
                  type="number"
                  min="0"
                  max="60"
                  className="input-field"
                  value={profileForm.experience_years}
                  onChange={set("experience_years")}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tp-qual">
                Highest Qualification
              </label>
              <input id="tp-qual" type="text" className="input-field" placeholder="e.g. M.Sc Physics, IIT Delhi" value={profileForm.qualification} onChange={set("qualification")} />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tp-ctc">
                Expected Annual CTC
              </label>
              <input id="tp-ctc" type="text" className="input-field" placeholder="e.g. ₹12 LPA - ₹18 LPA" value={profileForm.expected_ctc} onChange={set("expected_ctc")} />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tp-demo">
                Demo Video / Whiteboard URL
              </label>
              <input
                id="tp-demo"
                type="url"
                className="input-field"
                placeholder="https://youtube.com/watch?v=..."
                value={profileForm.demo_video_url}
                onChange={set("demo_video_url")}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="tp-bio">
                Professional Bio
              </label>
              <textarea
                id="tp-bio"
                className="input-field"
                rows={4}
                placeholder="Teaching approach, batch results, notable achievements..."
                value={profileForm.bio}
                onChange={set("bio")}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "0.5rem" }} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "Saving..." : "Save Profile Changes"}
            </button>
          </form>
        </div>

        {/* Right: Photo, KYC, Resume & Documents */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="card">
            <h3 className="card-title" style={{ marginBottom: "1rem" }}>
              KYC & Verification Status
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
              <div
                style={{
                  width: "52px",
                  height: "52px",
                  flexShrink: 0,
                  borderRadius: "50%",
                  background: verified ? "var(--color-brand-light)" : "var(--color-warning-bg)",
                  color: verified ? "var(--color-brand-green)" : "var(--color-warning)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldCheck size={28} />
              </div>
              <div>
                <div style={{ fontWeight: "700" }}>
                  {verified ? "Verified Educator" : currentUser?.verification_status === "Rejected" ? "Verification Rejected" : "Verification Pending"}
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {verified
                    ? "All degrees and background verified by EduHire mediators."
                    : currentUser?.verification_notes || "Upload your ID proof and degree certificates. Our team reviews documents within 24-48 hours."}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <UploadButton label="Upload ID Proof" accept=".pdf,.jpg,.jpeg,.png,.webp" documentType="KYC" uploadingType={uploadingType} onUpload={handleUpload} />
              <UploadButton
                label="Upload Certificate"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                documentType="CERTIFICATE"
                uploadingType={uploadingType}
                onUpload={handleUpload}
              />
            </div>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: "1rem" }}>
              Profile Photo
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  flexShrink: 0,
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "var(--color-brand-light)",
                  color: "var(--color-brand-green)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "1.4rem",
                }}
              >
                {currentUser?.profile_photo_url ? (
                  <img src={currentUser.profile_photo_url} alt="Your profile" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  initialOf(currentUser?.name, "T")
                )}
              </div>
              <div style={{ flex: 1 }}>
                <UploadButton
                  label={currentUser?.profile_photo_url ? "Change Photo" : "Upload Photo"}
                  accept=".jpg,.jpeg,.png,.webp"
                  documentType="PHOTO"
                  uploadingType={uploadingType}
                  onUpload={handleUpload}
                  icon={Camera}
                />
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>JPG, PNG or WEBP up to 5MB</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: "1rem" }}>
              Resume Document (PDF)
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
              Upload your latest CV with past batch results and coaching affiliations.
            </p>
            {currentUser?.resume_url && (
              <button
                type="button"
                className="btn btn-dark-outline btn-sm"
                style={{ width: "100%", marginBottom: "0.75rem", justifyContent: "center" }}
                onClick={() => openDocument("resume")}
              >
                <FileText size={14} /> View Current Resume{currentUser.resume_name ? ` (${currentUser.resume_name})` : ""}
              </button>
            )}
            <UploadButton
              label={currentUser?.resume_url ? "Upload New Resume" : "Upload Resume"}
              accept=".pdf,.doc,.docx"
              documentType="RESUME"
              uploadingType={uploadingType}
              onUpload={handleUpload}
            />
          </div>

          <div className="card">
            <h3 className="card-title" style={{ marginBottom: "1rem" }}>
              My Documents
            </h3>
            <QueryState query={documentsQuery} loadingLabel="Loading documents...">
              {documents.length === 0 ? (
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>No documents uploaded yet.</p>
              ) : (
                <ul style={{ display: "flex", flexDirection: "column", gap: "0.75rem", listStyle: "none", padding: 0 }}>
                  {documents.map((doc) => (
                    <li
                      key={doc.id}
                      style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "var(--color-canvas-warm)", padding: "0.65rem 0.85rem", borderRadius: "8px" }}
                    >
                      <FileText size={18} color="var(--color-brand-accent)" style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{doc.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          {DOC_LABELS[doc.document_type] || doc.document_type} · {doc.file_size} · {formatDate(doc.created_at)}
                        </div>
                      </div>
                      <span className={`badge ${doc.status === "Approved" || doc.status === "Verified" ? "badge-verified" : doc.status === "Rejected" ? "badge-rejected" : "badge-pending"}`}>
                        {doc.status}
                      </span>
                      <button type="button" className="btn-icon" style={{ background: "none", border: "none", cursor: "pointer" }} onClick={() => openDocument(doc)} aria-label={`Open ${doc.name}`}>
                        <ExternalLink size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-error)" }}
                        onClick={() => handleDelete(doc)}
                        disabled={deleteDoc.isPending}
                        aria-label={`Delete ${doc.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </QueryState>
          </div>
        </div>
      </div>
    </div>
  );
}
