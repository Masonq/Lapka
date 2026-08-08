import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, CheckCircle2 } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";

const TYPE_LABELS = {
  lost: "Потерялся",
  found: "Найден",
  adopt: "Ищет дом",
  question: "Вопрос",
  general: "Пост",
};

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");

  function load() {
    api.post(id).then(setPost);
    api.comments(id).then(setComments);
  }

  useEffect(load, [id]);

  async function submitComment(e) {
    e.preventDefault();
    if (!text.trim()) return;
    await api.addComment(id, { body: text });
    setText("");
    load();
  }

  async function markResolved() {
    await api.resolvePost(id);
    load();
  }

  if (!post) return <div className="empty-state">Загрузка…</div>;

  return (
    <div>
      <div className="top-header">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          <ArrowLeft size={16} /> Назад
        </button>
      </div>

      <div className="post-card glass" style={{ marginBottom: 20 }}>
        <span className={`post-type-rail ${post.type}`} />
        <span className={`post-badge ${post.type}`}>
          {post.is_resolved && <CheckCircle2 size={12} />}
          {post.is_resolved ? "Решено" : TYPE_LABELS[post.type]}
        </span>
        <h2 className="post-title">{post.title}</h2>
        <p className="post-body" style={{ WebkitLineClamp: "unset" }}>{post.body}</p>
        {post.last_seen_location && (
          <div className="post-meta" style={{ marginBottom: 8 }}>
            <span className="post-meta-item"><MapPin size={13} /> {post.last_seen_location}</span>
          </div>
        )}
        <div className="post-meta">
          <span>{post.author.display_name}</span>
        </div>

        {isAuthed && !post.is_resolved && (post.type === "lost" || post.type === "found") && (
          <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={markResolved}>
            <CheckCircle2 size={16} /> Отметить решённым
          </button>
        )}
      </div>

      <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, marginBottom: 10 }}>
        Комментарии ({comments.length})
      </h3>

      {comments.map((c) => (
        <div key={c.id} className="glass" style={{ borderRadius: 16, padding: "10px 14px", marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--primary-dark)" }}>
            {c.author.display_name}
          </div>
          <div style={{ fontSize: 14 }}>{c.body}</div>
        </div>
      ))}

      {isAuthed ? (
        <form onSubmit={submitComment} style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input
            style={{
              flex: 1, border: "1px solid var(--border-glass)", borderRadius: 999,
              padding: "10px 16px", fontSize: 14, background: "var(--bg-elevated)",
            }}
            placeholder="Написать комментарий…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn btn-primary">Отправить</button>
        </form>
      ) : (
        <p style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 12 }}>
          Войдите, чтобы оставить комментарий
        </p>
      )}
    </div>
  );
}
