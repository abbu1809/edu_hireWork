import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import { useDispatch } from "react-redux";
import { LogOut, Menu, X, Bell, Briefcase, GraduationCap, Home, Users, BookOpen, Info, Mail, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { logoutUser } from "@/features/auth/store/authSlice";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { queryClient } from "@/app/queryClient";
import { notify } from "@/shared/utils/notify";
import { homePathForRole, initialOf } from "@/shared/utils/format";

const PUBLIC_LINKS = [
  { to: "/", label: "Home", end: true, icon: Home },
  { to: "/careers", label: "Careers", icon: Briefcase },
  { to: "/faculty", label: "Find Faculty", icon: Users },
  { to: "/content-hub", label: "Content Hub", icon: BookOpen },
  { to: "/about", label: "About Us", icon: Info },
  { to: "/contact", label: "Contact", icon: Mail },
];

const PORTAL_LABELS = { teacher: "Teacher Portal", institute: "Institute Portal", admin: "Admin Command" };

export default function Navbar() {
  const { currentUser, role } = useAuth();
  const { data: notifications } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const unreadCount = notifications?.unread || 0;
  const dashboardPath = homePathForRole(role);

  // Close menus on navigation.
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setMobileMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!userDropdownOpen) return undefined;
    const onClick = (e) => dropdownRef.current && !dropdownRef.current.contains(e.target) && setUserDropdownOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [userDropdownOpen]);

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    await dispatch(logoutUser());
    queryClient.clear();
    notify.info("You have been logged out.");
    navigate("/");
  };

  return (
    <header className="global-nav">
      <div className="nav-container">
        {/* Brand Wordmark & Logo */}
        <Link to="/" className="brand-logo-link" onClick={() => setMobileMenuOpen(false)}>
          <div className="brand-symbol"><GraduationCap size={20} aria-hidden="true" /></div>
          <div className="brand-name">
            EduHire <span>Bridge</span>
          </div>
        </Link>

        {/* Desktop Links */}
        <nav className="nav-menu-links max-[1100px]:!hidden" aria-label="Main">
          {PUBLIC_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className="nav-link-item">
              {link.label}
            </NavLink>
          ))}
          {currentUser && PORTAL_LABELS[role] && (
            <NavLink to={dashboardPath} className="nav-link-item">
              {PORTAL_LABELS[role]}
            </NavLink>
          )}
        </nav>

        {/* Action Buttons & Profile */}
        <div className="nav-actions">
          {currentUser ? (
            <div ref={dropdownRef} style={{ display: "flex", alignItems: "center", gap: "0.75rem", position: "relative" }}>
              {/* Notification Bell */}
              <Link
                to="/notifications"
                className="btn-icon"
                style={{ background: "var(--color-canvas-warm)", border: "none", cursor: "pointer", position: "relative" }}
                title="Notifications"
                aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
              >
                <Bell size={18} color="var(--color-brand-house)" />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "2px",
                      right: "2px",
                      background: "var(--color-error)",
                      color: "#fff",
                      fontSize: "0.65rem",
                      fontWeight: "700",
                      minWidth: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              {/* User Avatar & Menu Pill */}
              <button
                className="btn btn-outline"
                style={{ padding: "6px 14px", display: "flex", alignItems: "center", gap: "0.5rem" }}
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                aria-expanded={userDropdownOpen}
                aria-haspopup="menu"
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "var(--color-brand-accent)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                  }}
                >
                  {initialOf(currentUser.name)}
                </div>
                <span
                  className="max-[480px]:hidden"
                  style={{ maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {currentUser.name || currentUser.email?.split("@")[0]}
                </span>
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    top: "115%",
                    right: 0,
                    width: "220px",
                    background: "var(--color-surface-white)",
                    borderRadius: "var(--radius-card)",
                    boxShadow: "var(--shadow-modal)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    padding: "0.75rem",
                    zIndex: 200,
                  }}
                >
                  <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--color-canvas-ceramic)", marginBottom: "0.5rem" }}>
                    <p style={{ fontWeight: "700", fontSize: "0.9rem", color: "var(--text-primary)" }}>{currentUser.name}</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", wordBreak: "break-all" }}>{currentUser.email}</p>
                    <span className="badge badge-role" style={{ marginTop: "0.35rem" }}>
                      {role.toUpperCase()}
                    </span>
                  </div>

                  <Link
                    to={dashboardPath}
                    role="menuitem"
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.88rem", fontWeight: "600", borderRadius: "8px" }}
                  >
                    <Briefcase size={16} /> My Dashboard
                  </Link>

                  <Link
                    to="/notifications"
                    role="menuitem"
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", fontSize: "0.88rem", fontWeight: "600", borderRadius: "8px" }}
                  >
                    <Bell size={16} /> Notifications {unreadCount > 0 && `(${unreadCount})`}
                  </Link>

                  <button
                    role="menuitem"
                    onClick={handleLogout}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 0.75rem",
                      fontSize: "0.88rem",
                      fontWeight: "600",
                      borderRadius: "8px",
                      background: "none",
                      border: "none",
                      color: "var(--color-error)",
                      cursor: "pointer",
                      textAlign: "left",
                      marginTop: "0.25rem",
                    }}
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="max-[640px]:!hidden" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Link to="/auth?mode=login" className="btn btn-dark-outline">
                Sign in
              </Link>
              <Link to="/auth?mode=signup" className="btn btn-black">
                Join now
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Button (shown when the desktop links are hidden) */}
          <button
            className="btn-icon hidden max-[1100px]:!flex"
            style={{ background: "none", border: "none", cursor: "pointer" }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-drawer"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer — portalled to <body>: the header's backdrop-filter would
          otherwise become the containing block and clip this fixed panel. */}
      {mobileMenuOpen &&
        createPortal(
        <nav id="mobile-drawer" className="mobile-drawer" aria-label="Mobile">
          {PUBLIC_LINKS.map(({ to, label, end, icon: Icon }) => (
            <NavLink key={to} to={to} end={end} className="nav-link-item">
              <Icon size={19} aria-hidden="true" /> {label}
            </NavLink>
          ))}
          {currentUser && PORTAL_LABELS[role] && (
            <NavLink to={dashboardPath} className="nav-link-item">
              <LayoutDashboard size={19} aria-hidden="true" /> {PORTAL_LABELS[role]}
            </NavLink>
          )}

          {currentUser ? (
            <Link to={dashboardPath} className="btn btn-primary" style={{ marginTop: "1rem" }}>
              Go to Dashboard
            </Link>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
              <Link to="/auth?mode=login" className="btn btn-outline">
                Sign in
              </Link>
              <Link to="/auth?mode=signup" className="btn btn-primary">
                Join now
              </Link>
            </div>
          )}
        </nav>,
          document.body
        )}
    </header>
  );
}
