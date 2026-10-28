/** The original empty-state card: icon circle, heading, text and an optional action. */
export default function EmptyState({ icon: Icon, iconSize = 32, title, children, action, bare = false, style }) {
  return (
    <div className="empty-state-card" style={bare ? { border: "none", padding: "2rem", ...style } : style}>
      {Icon && (
        <div className="empty-state-icon">
          <Icon size={iconSize} />
        </div>
      )}
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
