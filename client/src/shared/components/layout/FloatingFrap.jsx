import { useState } from "react";
import { useNavigate } from "react-router";
import { Plus, Briefcase, UserCheck, MessageSquare, X } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";

const ACTIONS = {
  guest: [
    { label: "Join as Teacher", path: "/auth?mode=signup&role=teacher", icon: UserCheck, variant: "btn-outline" },
    { label: "Post Vacancy", path: "/auth?mode=signup&role=institute", icon: Plus, variant: "btn-primary" },
  ],
  teacher: [
    { label: "Explore Jobs", path: "/teacher/jobs", icon: Briefcase, variant: "btn-outline" },
    { label: "Update Profile", path: "/teacher/profile", icon: UserCheck, variant: "btn-primary" },
  ],
  institute: [
    { label: "Post Vacancy", path: "/institute/vacancies?new=1", icon: Plus, variant: "btn-primary" },
    { label: "Search Faculty", path: "/institute/talent", icon: UserCheck, variant: "btn-outline" },
  ],
  admin: [
    { label: "Review KYC", path: "/admin/teachers", icon: UserCheck, variant: "btn-primary" },
    { label: "ATS Matchmaking", path: "/admin/vacancies", icon: Briefcase, variant: "btn-outline" },
  ],
};

/** 56px floating quick-action button. */
export default function FloatingFrap() {
  const [open, setOpen] = useState(false);
  const { currentUser, role } = useAuth();
  const navigate = useNavigate();

  const actions = currentUser ? ACTIONS[role] || [] : ACTIONS.guest;

  const handleAction = (path) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "5.5rem",
            right: "1.5rem",
            background: "var(--color-surface-white)",
            borderRadius: "var(--radius-card)",
            boxShadow: "var(--shadow-modal)",
            border: "1px solid rgba(0,0,0,0.08)",
            padding: "0.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            zIndex: 100,
            width: "210px",
            animation: "modalSlideUp 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
          }}
        >
          <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", padding: "0.25rem 0.5rem" }}>
            Quick Actions
          </div>

          {actions.map(({ label, path, icon: Icon, variant }) => (
            <button
              key={label}
              className={`btn ${variant} btn-sm`}
              style={{ justifyContent: "flex-start", width: "100%" }}
              onClick={() => handleAction(path)}
            >
              <Icon size={16} /> {label}
            </button>
          ))}

          <button
            className="btn btn-dark-outline btn-sm"
            style={{ justifyContent: "flex-start", width: "100%" }}
            onClick={() => handleAction("/contact")}
          >
            <MessageSquare size={16} /> Support Desk
          </button>
        </div>
      )}

      <button className="frap-btn" onClick={() => setOpen(!open)} title="Quick Menu" aria-label="Quick Action Menu" aria-expanded={open}>
        {open ? <X size={24} /> : <Plus size={26} />}
      </button>
    </>
  );
}
