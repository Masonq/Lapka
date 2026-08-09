import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, MessageCircle, CheckCircle2, Bookmark } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";

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
  const { isAuthed } = useAuth();
  const { showToast } = useToast();
  const [saved, setSaved] = useState(post.is_saved);
  const [busy, setBusy] = useState(false);
  const showTrag = (post.type === "lost" || post.type === "found") && post.last_seen_location;

  async function toggleSave(e) {
    e.preventDefault(); // не даём сработать вложенной ссылке на пост
    if (busy) return;
    setBusy(true);
    const next = !saved;
    setSaved(next); // оптимистично — визуально мгновенно
    try {
      if (next) await api.savePost(post.id);
      else await api.unsavePost(post.id);
    } catch (err) {
      setSaved(!next); // откатываем, если не получилось
      showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="post-card card">
      {isAuthed && (
        <button
          className="post-save-btn"
          onClick={toggleSave}
          aria-label={saved ? "Убрать из сохранённого" : "Сохранить"}
          aria-pressed={saved}
        >
          <Bookmark size={16} strokeWidth={2.2} fill={saved ? "currentColor" : "none"} />
        </button>
      )}

      <Link to={`/posts/${post.id}`} className="post-card-link">
        {post.photo_url && (
          <img src={post.photo_url} alt={post.title} className="post-card-photo" />
        )}
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
      </Link>

      <div className="post-meta">
        <Link to={`/users/${post.author.id}`} className="post-meta-item post-meta-author">
          <span className="post-meta-text">{post.author.display_name}</span>
        </Link>
        {post.last_seen_location && (
          <span className="post-meta-item" style={{ minWidth: 0 }}>
            <MapPin size={13} /> <span className="post-meta-text">{post.last_seen_location}</span>
          </span>
        )}
        <span className="post-meta-item" style={{ flexShrink: 0 }}>
          <MessageCircle size={13} /> {post.comments_count}
        </span>
        <span style={{ marginLeft: "auto", flexShrink: 0 }}>{timeAgo(post.created_at)}</span>
      </div>
    </div>
  );
}
