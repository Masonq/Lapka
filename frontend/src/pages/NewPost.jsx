import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";

const TYPES = [
  { value: "lost", label: "Потерялся" },
  { value: "found", label: "Найден" },
  { value: "adopt", label: "Ищет дом" },
  { value: "question", label: "Вопрос" },
  { value: "general", label: "Общий пост" },
];

export default function NewPost() {
  const { isAuthed } = useAuth();
  const navigate = useNavigate();
  const [type, setType] = useState("lost");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [location, setLocation] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isAuthed) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Нужно войти</div>
        Чтобы опубликовать пост, сначала войдите в аккаунт
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => navigate("/profile")}>
            Войти
          </button>
        </div>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const post = await api.createPost({
        type,
        title,
        body,
        last_seen_location: location || undefined,
      });
      navigate(`/posts/${post.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const needsLocation = type === "lost" || type === "found";

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">Новый пост</span>
        <span style={{ width: 38 }} />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Тип поста</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Заголовок</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
        </div>

        <div className="field">
          <label>Описание</label>
          <textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} required />
        </div>

        {needsLocation && (
          <div className="field">
            <label>Где видели (район, улица)</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
        )}

        {error && <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>}

        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "Публикуем…" : "Опубликовать"}
        </button>
      </form>
    </div>
  );
}
