export default function ListItemSkeleton({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="card"
          aria-hidden="true"
          style={{
            display: "flex", alignItems: "center", gap: 12, borderRadius: 16,
            padding: "12px 14px", marginBottom: 8,
          }}
        >
          <span className="skeleton" style={{ width: 44, height: 44, borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <span className="skeleton skeleton-title" style={{ width: "50%", marginBottom: 6 }} />
            <span className="skeleton skeleton-line" style={{ width: "75%", marginBottom: 0 }} />
          </div>
        </div>
      ))}
    </>
  );
}
