import { NavLink, Outlet } from "react-router";

/**
 * Sidebar + content shell shared by the three portals (original classes).
 * `navItems`: [{ to, label, icon, end, count }]
 */
export default function DashboardLayout({ userCard, beforeNav, navItems }) {
  return (
    <div className="dashboard-layout">
      <aside className="dashboard-sidebar">
        {userCard}
        {beforeNav}
        <nav aria-label="Dashboard">
          <ul className="sidebar-nav-list">
            {navItems.map(({ to, label, icon: Icon, end, count }) => (
              <li key={to}>
                <NavLink to={to} end={end} className="sidebar-nav-item" style={{ whiteSpace: "nowrap" }}>
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
