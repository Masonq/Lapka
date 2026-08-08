import { useState } from "react";
import { Link } from "react-router-dom";
import { Star, Phone, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";

const TYPE_RU = {
  sitter: "Ситтер", boarding: "Передержка", trainer: "Кинолог", vet: "Ветеринар", groomer: "Грумер",
};

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days < 1) return "сегодня";
  if (days < 30) return `${days} дн назад`;
  return `${Math.floor(days / 30)} мес назад`;
}

export default function ProviderCard({ provider, onReviewed }) {
  const { isAuthed } = useAuth();
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [reviews, setReviews] = useState(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function toggleExpanded() {
    const next = !expanded;
    setExpanded(next);
    if (next && reviews === null) {
      setLoadingReviews(true);
      api.providerReviews(provider.id).then(setReviews).catch(() => setReviews([])).finally(() => setLoadingReviews(false));
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.reviewProvider(provider.id, { rating, body: body.trim() || undefined });
      showToast("Отзыв опубликован");
      setShowForm(false);
      setBody("");
      setRating(5);
      const updated = await api.providerReviews(provider.id);
      setReviews(updated);
      onReviewed?.();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card" style={{ borderRadius: 20, padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span className="post-badge" style={{ background: "var(--gray-tint)", color: "var(--text-muted)" }}>
            {TYPE_RU[provider.service_type]}
          </span>
          <div className="subhead" style={{ marginTop: 6 }}>
            <Link to={`/users/${provider.user.id}`} className="post-meta-author">{provider.user.display_name}</Link>
          </div>
        </div>
        {provider.rating_count > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: "var(--black)" }}>
            <Star size={14} fill="var(--star)" strokeWidth={0} /> {provider.rating_avg}
          </div>
        )}
      </div>

      <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "8px 0" }}>{provider.description}</p>

      <div className="post-meta">
        {provider.price_from != null && <span>от {provider.price_from} дин.</span>}
        {provider.contact && (
          <span className="post-meta-item"><Phone size={13} /> {provider.contact}</span>
        )}
      </div>

      <button
        type="button"
        onClick={toggleExpanded}
        style={{
          display: "flex", alignItems: "center", gap: 4, marginTop: 10, fontSize: 13, fontWeight: 700,
          color: "var(--black)", background: "none", border: "none", cursor: "pointer", padding: 0,
        }}
      >
        Отзывы {provider.rating_count > 0 ? `(${provider.rating_count})` : ""}
        {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {expanded && (
        <div style={{ marginTop: 10 }}>
          {loadingReviews && <p style={{ fontSize: 13, color: "var(--text-faint)" }}>Загружаем…</p>}

          {!loadingReviews && reviews?.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-faint)" }}>Пока нет отзывов</p>
          )}

          {!loadingReviews && reviews?.map((r) => (
            <div key={r.id} style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>
                  <Link to={`/users/${r.author.id}`} className="post-meta-author">{r.author.display_name}</Link>
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={11}
                      fill={i < r.rating ? "var(--star)" : "var(--gray-tint)"}
                      stroke="none"
                    />
                  ))}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: "auto" }}>{timeAgo(r.created_at)}</span>
              </div>
              {r.body && <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{r.body}</p>}
            </div>
          ))}

          {isAuthed && !showForm && (
            <button type="button" className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => setShowForm(true)}>
              Оставить отзыв
            </button>
          )}

          {showForm && (
            <form onSubmit={submitReview} style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }} role="radiogroup" aria-label="Оценка">
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(i + 1)}
                    aria-label={`${i + 1} из 5`}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
                  >
                    <Star size={22} fill={i < rating ? "var(--star)" : "var(--gray-tint)"} stroke="none" />
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Как всё прошло? (необязательно)"
                style={{
                  width: "100%", border: "1px solid var(--border)", borderRadius: 12,
                  padding: "8px 12px", fontSize: 13, fontFamily: "var(--font-body)", marginBottom: 8, resize: "vertical",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Отправляем…" : "Отправить"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                  Отмена
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
