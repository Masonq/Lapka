import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";

const TYPES = [
  { value: "lost", label: "Потерялся" },
  { value: "found", label: "Найден" },
  { value: "adopt", label: "Ищет дом" },
  { value: "question", label: "Вопрос" },
  { value: "general", label: "Общий пост" },
];

export default function NewPost() {
  useDocumentTitle("Новый пост");
  const { isAuthed } = useAuth();
  const { showToast } = useToast();
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
        Чтобы опубликовать пост, сначала войди в аккаунт
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
      showToast("Пост опубликован");
      navigate(`/posts/${post.id}`);
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
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
        <span style={{ width: 44 }} />
      </div>

      <div className="detail-shell">
        <div className="field">
          <label id="post-type-label">Тип поста</label>
          <div className="chip-row" role="group" aria-labelledby="post-type-label" style={{ paddingBottom: 2 }}>
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`chip${type === t.value ? " active" : ""}`}
                onClick={() => setType(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ borderRadius: 20, padding: 18 }}>
        <div className="field">
          <label htmlFor="post-title">Заголовок</label>
          <input
            id="post-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            placeholder="Например: Бела, вест-хайленд-терьер"
          />
        </div>

        <div className="field">
          <label htmlFor="post-body">Описание</label>
          <textarea
            id="post-body"
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            placeholder="Опиши, что случилось, приметы, обстоятельства"
          />
        </div>

        {needsLocation && (
          <div className="field">
            <label htmlFor="post-location">Где видели (район, улица)</label>
            <input id="post-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Например: Ташмайдан" />
          </div>
        )}

        {error && <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>}

        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "Публикуем…" : "Опубликовать"}
        </button>
        </form>
      </div>
    </div>
  );
}
