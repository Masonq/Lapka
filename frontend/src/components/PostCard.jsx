import { Link } from "react-router-dom";
import { MapPin, MessageCircle, CheckCircle2 } from "lucide-react";

const TYPE_LABELS = {
  lost: "Потерялся",
  found: "Найден",
  adopt: "Ищет дом",
  question: "Вопрос",
  general: "Пост",
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  return `${Math.floor(hrs / 24)} дн назад`;
}

export default function PostCard({ post }) {
  const showTrag = (post.type === "lost" || post.type === "found") && post.last_seen_location;

  return (
    <Link to={`/posts/${post.id}`} className="post-card glass">
      <span className={`post-type-rail ${post.type}`} />
      <span className={`post-badge ${post.type}`}>
        {post.is_resolved && <CheckCircle2 size={12} />}
        {post.is_resolved ? "Решено" : TYPE_LABELS[post.type]}
      </span>

      <h3 className="post-title">{post.title}</h3>
      <p className="post-body">
        {post.body.length > 140 ? `${post.body.slice(0, 140)}…` : post.body}
      </p>

      {showTrag && (
        <div className="trag">
          <span className="trag-dot" />
          <span className="trag-dot" />
          <span className="trag-dot" />
        </div>
      )}

      <div className="post-meta">
        <span className="post-meta-item">{post.author.display_name}</span>
        {post.last_seen_location && (
          <span className="post-meta-item">
            <MapPin size={13} /> {post.last_seen_location}
          </span>
        )}
        <span className="post-meta-item">
          <MessageCircle size={13} /> {post.comments_count}
        </span>
        <span style={{ marginLeft: "auto" }}>{timeAgo(post.created_at)}</span>
      </div>
    </Link>
  );
}
