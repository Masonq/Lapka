export default function ServiceCardSkeleton() {
  return (
    <div className="card" style={{ borderRadius: 20, padding: 16, marginBottom: 10 }} aria-hidden="true">
      <span className="skeleton skeleton-badge" style={{ width: 70 }} />
      <span className="skeleton skeleton-title" style={{ width: "50%", marginTop: 10 }} />
      <span className="skeleton skeleton-line" style={{ marginTop: 10 }} />
      <span className="skeleton skeleton-line" style={{ width: "60%" }} />
    </div>
  );
}
