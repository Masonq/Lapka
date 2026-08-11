import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star, Phone, ChevronDown, ChevronUp, BadgeCheck } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useAutoResizeTextarea } from "../useAutoResizeTextarea";
import { useToast } from "../ToastContext";
import { useTranslation } from "react-i18next";

// Переиспользую те же ключи, что уже есть у типов услуг в Settings.jsx —
// один и тот же смысл (Ситтер/Передержка/Кинолог/Ветеринар/Грумер), не дублирую
const TYPE_KEYS = {
  sitter: "settings.service_sitter", boarding: "settings.service_boarding",
  trainer: "settings.service_trainer", vet: "settings.service_vet", groomer: "settings.service_groomer",
};

export default function ProviderCard({ provider, onReviewed }) {
  const { t } = useTranslation();

  function timeAgo(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const days = Math.floor(diffMs / 86400000);
    if (days < 1) return t("provider_card.today");
    if (days < 30) return t("provider_card.days_ago", { days });
    return t("provider_card.months_ago", { months: Math.floor(days / 30) });
  }

  const { isAuthed } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [reviews, setReviews] = useState(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const bodyRef = useAutoResizeTextarea(body);
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
      showToast(t("provider_card.review_published"));
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
    <div
      className="card"
      style={{ borderRadius: 20, padding: 16, cursor: "pointer" }}
      onClick={() => navigate(`/users/${provider.user.id}`)}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span className="post-badge" style={{ background: "var(--gray-tint)", color: "var(--text-muted)" }}>
            {t(TYPE_KEYS[provider.service_type])}
          </span>
          <div className="subhead" style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
            <Link to={`/users/${provider.user.id}`} className="post-meta-author" onClick={(e) => e.stopPropagation()}>{provider.user.display_name}</Link>
            {provider.is_verified && (
              <BadgeCheck size={15} style={{ color: "var(--green-strong)", flexShrink: 0 }} aria-label={t("provider_card.verified_aria")} />
            )}
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
        {provider.price_from != null && <span>{t("provider_card.price_from", { price: provider.price_from })}</span>}
        {provider.contact && (
          <span className="post-meta-item"><Phone size={13} /> {provider.contact}</span>
        )}
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); toggleExpanded(); }}
        style={{
          display: "flex", alignItems: "center", gap: 4, marginTop: 10, fontSize: 13, fontWeight: 700,
          color: "var(--black)", background: "none", border: "none", cursor: "pointer", padding: 0,
        }}
      >
        {t("provider_card.reviews")} {provider.rating_count > 0 ? `(${provider.rating_count})` : ""}
        {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {expanded && (
        <div style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
          {loadingReviews && <p style={{ fontSize: 13, color: "var(--text-faint)" }}>{t("provider_card.loading")}</p>}

          {!loadingReviews && reviews?.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--text-faint)" }}>{t("provider_card.no_reviews")}</p>
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
              {t("provider_card.leave_review")}
            </button>
          )}

          {showForm && (
            <form onSubmit={submitReview} style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }} role="radiogroup" aria-label={t("provider_card.rating_aria")}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRating(i + 1)}
                    aria-label={t("provider_card.star_aria", { n: i + 1 })}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
                  >
                    <Star size={22} fill={i < rating ? "var(--star)" : "var(--gray-tint)"} stroke="none" />
                  </button>
                ))}
              </div>
              <textarea
                ref={bodyRef}
                rows={2}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t("provider_card.review_placeholder")}
                autoComplete="off"
                style={{
                  width: "100%", border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", color: "var(--text)",
                  padding: "8px 12px", fontSize: 16, fontFamily: "var(--font-body)", marginBottom: 8, overflow: "hidden", resize: "none",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" disabled={submitting}>
                  {submitting ? t("provider_card.sending") : t("provider_card.send")}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                  {t("settings.cancel")}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
