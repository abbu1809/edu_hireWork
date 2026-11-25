import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router";
import { Menu, X } from "lucide-react";

/**
 * Sidebar + content shell shared by the three portals (Teacher, Institute, Admin).
 * Desktop: sticky left sidebar. Mobile (<1024px): menu bar + slide-out left sidebar drawer.
 * `navItems`: [{ to, label, icon, end, count }]
 */
export default function DashboardLayout({ userCard, beforeNav, navItems }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { pathname } = useLocation();

  // Close mobile sidebar when navigating to a new route or pressing Escape
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const activeItem = navItems.find((item) =>
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)
  );

  return (
    <div className="dashboard-layout">
      {/* Mobile / Tablet Menu Trigger Bar (hidden on desktop >= 1024px via CSS) */}
      <div className="dashboard-mobile-bar">
        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={() => setMobileOpen(true)}
          aria-label="Open dashboard menu"
          aria-expanded={mobileOpen}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}
        >
          <Menu size={18} aria-hidden="true" />
          <span>Menu</span>
        </button>
        <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--color-brand-house)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {activeItem?.label || "Dashboard"}
        </span>
      </div>

      {/* Backdrop on mobile when sidebar drawer is open */}
      {mobileOpen && (
        <div
          className="dashboard-drawer-backdrop"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside className={`dashboard-sidebar ${mobileOpen ? "is-open" : ""}`}>
        <div className="dashboard-drawer-close-row">
          <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--color-brand-house)" }}>Navigation</span>
          <button
            type="button"
            className="btn-icon"
            onClick={() => setMobileOpen(false)}
            aria-label="Close dashboard menu"
            style={{ background: "var(--color-canvas-warm)", border: "none", cursor: "pointer" }}
          >
            <X size={18} />
          </button>
        </div>

        {userCard}
        {beforeNav}
        <nav aria-label="Dashboard">
          <ul className="sidebar-nav-list">
            {navItems.map(({ to, label, icon: Icon, end, count }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className="sidebar-nav-item"
                  style={{ whiteSpace: "nowrap" }}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon size={18} aria-hidden="true" /> {label}
                  {count !== undefined && (
                    <span className="sidebar-count" aria-label={`${count} items`}>
                      {count}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}

export function SidebarUserCard({ initial, name, subtitle, style, avatarStyle, nameStyle, subtitleStyle, photoUrl }) {
  return (
    <div className="sidebar-user-card" style={style}>
      <div className="sidebar-avatar" style={{ overflow: "hidden", ...avatarStyle }}>
        {photoUrl ? <img src={photoUrl} alt="" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initial}
      </div>
      <div style={{ overflow: "hidden" }}>
        <div className="sidebar-user-name" style={nameStyle}>
          {name}
        </div>
        <div className="sidebar-user-role" style={subtitleStyle}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}

export function DashboardHeader({ title, subtitle, actions }) {
  return (
    <div className="dashboard-header" style={{ flexWrap: "wrap", gap: "1rem" }}>
      <div className="dashboard-title-area">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>{actions}</div>}
    </div>
  );
}

export function KpiCard({ icon: Icon, label, value }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon-circle">
        <Icon size={22} />
      </div>
      <div className="kpi-meta">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
      </div>
    </div>
  );
}
