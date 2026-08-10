export default function DetailCardSkeleton({ withPhoto = false }) {
  return (
    <div className="card" aria-hidden="true" style={{ borderRadius: 20, padding: 20, marginBottom: 16 }}>
      {withPhoto && (
        <span className="skeleton" style={{ width: "100%", height: 180, borderRadius: 14, marginBottom: 14, display: "block" }} />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
        <span className="skeleton" style={{ width: 56, height: 56, borderRadius: "50%", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <span className="skeleton skeleton-title" style={{ width: "60%", marginBottom: 8 }} />
          <span className="skeleton skeleton-line" style={{ width: "40%", marginBottom: 0 }} />
        </div>
      </div>
      <span className="skeleton skeleton-line" style={{ width: "100%" }} />
      <span className="skeleton skeleton-line" style={{ width: "90%" }} />
      <span className="skeleton skeleton-line" style={{ width: "60%", marginBottom: 0 }} />
    </div>
  );
}
