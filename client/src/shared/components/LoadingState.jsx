export default function LoadingState({ label = "Loading...", compact = false }) {
  return (
    <div className="loading-state-container" style={compact ? { minHeight: "200px" } : undefined} role="status">
      <div className="spinner-green" />
      <p className="loading-label">{label}</p>
    </div>
  );
}
