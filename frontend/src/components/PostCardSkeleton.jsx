export default function PostCardSkeleton() {
  return (
    <div className="post-card card" aria-hidden="true">
      <span className="skeleton skeleton-badge" />
      <span className="skeleton skeleton-title" />
      <span className="skeleton skeleton-line" />
      <span className="skeleton skeleton-line" style={{ width: "70%" }} />
      <div className="post-meta" style={{ marginTop: 10 }}>
        <span className="skeleton skeleton-meta" />
        <span className="skeleton skeleton-meta" style={{ width: 40 }} />
      </div>
    </div>
  );
}
