import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, CheckCircle2, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";

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
  const { isAuthed, userId } = useAuth();
  const { showToast } = useToast();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  useDocumentTitle(post ? post.title : "Пост");

  function load() {
    api.post(id).then(setPost).catch(() => setNotFound(true));
    api.comments(id).then(setComments).catch(() => setComments([]));
  }

  useEffect(load, [id]);

  async function submitComment(e) {
    e.preventDefault();
    if (!text.trim()) return;
    try {
      await api.addComment(id, { body: text });
      setText("");
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function markResolved() {
    await api.resolvePost(id);
    showToast("Отмечено решённым");
    load();
  }

  async function handleDelete() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    await api.deletePost(id);
    showToast("Пост удалён");
    navigate("/");
  }

  if (notFound) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Пост не найден</div>
        Возможно, его удалили или ссылка устарела
      </div>
    );
  }

  if (!post) return <div className="empty-state">Загружаем пост…</div>;

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">Пост</span>
        <span style={{ width: 44 }} />
      </div>

      <div className="detail-shell">
        <div className="post-card card" style={{ marginBottom: 20 }}>
          {post.photo_url && (
            <img src={post.photo_url} alt="" className="post-card-photo" />
          )}
          <span className={`post-badge ${post.type}`}>
            {post.is_resolved && <CheckCircle2 size={12} />}
            {post.is_resolved ? "Решено" : TYPE_LABELS[post.type]}
          </span>
          <h2 className="post-title">{post.title}</h2>
          <p className="post-body">{post.body}</p>
          {post.last_seen_location && (
            <div className="post-meta" style={{ marginBottom: 8 }}>
              <span className="post-meta-item"><MapPin size={13} /> {post.last_seen_location}</span>
            </div>
          )}
          <div className="post-meta">
            <span>{post.author.display_name}</span>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            {isAuthed && !post.is_resolved && (post.type === "lost" || post.type === "found") && (
              <button className="btn btn-ghost" onClick={markResolved}>
                <CheckCircle2 size={16} /> Отметить решённым
              </button>
            )}
            {post.author.id === userId && (
              <button
                className="btn btn-ghost"
                style={confirmingDelete ? { background: "var(--red-tint)", color: "var(--red)" } : undefined}
                onClick={handleDelete}
                onBlur={() => setConfirmingDelete(false)}
              >
                <Trash2 size={16} /> {confirmingDelete ? "Точно удалить?" : "Удалить пост"}
              </button>
            )}
          </div>
        </div>

        <h3 className="subhead" style={{ marginBottom: 10 }}>
          Комментарии ({comments.length})
        </h3>

        {comments.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 12 }}>
            Пока нет комментариев — можешь стать первым
          </p>
        )}

        {comments.map((c) => (
          <div key={c.id} className="card" style={{ borderRadius: 16, padding: "10px 14px", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--black)" }}>
              {c.author.display_name}
            </div>
            <div style={{ fontSize: 14 }}>{c.body}</div>
          </div>
        ))}

        {isAuthed ? (
          <form onSubmit={submitComment} style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <input
              style={{
                flex: 1, border: "1px solid var(--border)", borderRadius: 999,
                padding: "10px 16px", fontSize: 14, background: "var(--surface)",
              }}
              placeholder="Написать комментарий…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button className="btn btn-primary">Отправить</button>
          </form>
        ) : (
          <p style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 12 }}>
            Войди, чтобы оставить комментарий
          </p>
        )}
      </div>
    </div>
  );
}
