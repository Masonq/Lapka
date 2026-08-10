import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, MessageCircle, CheckCircle2, Bookmark, ShieldCheck } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useTranslation } from "react-i18next";

const TYPE_LABELS = {
  lost: "post_type.lost",
  found: "post_type.found",
  adopt: "post_type.adopt",
  question: "post_type.question",
  general: "post_type.general",
};

function timeAgo(iso, t) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return t("time.just_now");
  if (min < 60) return t("time.min_ago", { min });
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return t("time.hours_ago", { hours: hrs });
  return t("time.days_ago", { days: Math.floor(hrs / 24) });
}

export default function PostCard({ post }) {
  const { t } = useTranslation();
  const { isAuthed } = useAuth();
  const { showToast } = useToast();
  const [saved, setSaved] = useState(post.is_saved);
  const [busy, setBusy] = useState(false);

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
          aria-label={saved ? t("post.save_remove_aria") : t("post.save_aria")}
          aria-pressed={saved}
        >
          <Bookmark size={16} strokeWidth={2.2} fill={saved ? "currentColor" : "none"} />
        </button>
      )}

      <Link to={`/posts/${post.id}`} className="post-card-link">
        {post.photo_url && (
          <img src={post.photo_url} alt={post.title} className="post-card-photo" />
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span className={`post-badge ${post.type}`}>
            {post.is_resolved && <CheckCircle2 size={12} />}
            {post.is_resolved ? t("post_type.resolved") : t(TYPE_LABELS[post.type])}
          </span>
          {post.author.is_staff && post.show_staff_badge && (
            <span className="badge badge-solid">
              <ShieldCheck size={11} /> {t("post.staff_badge")}
            </span>
          )}
        </div>

        <h3 className="post-title">{post.title}</h3>
        <p className="post-body">
          {post.body.length > 140 ? `${post.body.slice(0, 140)}…` : post.body}
        </p>
      </Link>

      <div className="post-meta">
        <Link to={`/users/${post.author.id}`} className="post-meta-item post-meta-author">
          <span className="post-meta-text" title={post.author.display_name}>{post.author.display_name}</span>
        </Link>
        {post.last_seen_location && (
          <span className="post-meta-item" style={{ minWidth: 0 }}>
            <MapPin size={13} /> <span className="post-meta-text" title={post.last_seen_location}>{post.last_seen_location}</span>
          </span>
        )}
        <span className="post-meta-item" style={{ flexShrink: 0 }}>
          <MessageCircle size={13} /> {post.comments_count}
        </span>
        <span style={{ marginLeft: "auto", flexShrink: 0 }}>{timeAgo(post.created_at, t)}</span>
      </div>
    </div>
  );
}
