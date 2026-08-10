import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, MapPin, Users, PawPrint, UserMinus } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import { useTranslation } from "react-i18next";
import DetailCardSkeleton from "../components/DetailCardSkeleton";

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", weekday: "short" }) + ", " +
    d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export default function EventDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const { showToast } = useToast();
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  useDocumentTitle(event ? event.title : t("event_detail.title"));

  function load() {
    api.event(id).then(setEvent).catch(() => setNotFound(true));
    api.eventParticipants(id).then(setParticipants).catch(() => setParticipants([]));
  }

  useEffect(load, [id]);

  async function toggle() {
    setBusy(true);
    try {
      if (event.is_going) await api.leaveEvent(id);
      else await api.joinEvent(id);
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">{t("event_detail.not_found_title")}</div>
        {t("event_detail.not_found_hint")}
      </div>
    );
  }

  if (!event) {
    return (
      <div>
        <div className="page-header">
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("event_detail.back_aria")}>
            <ArrowLeft size={17} strokeWidth={2.2} />
          </button>
          <span className="page-title">{t("event_detail.title")}</span>
          <span style={{ width: 44 }} />
        </div>
        <div className="detail-shell">
          <DetailCardSkeleton />
        </div>
      </div>
    );
  }

  const full = event.capacity != null && event.participants_count >= event.capacity && !event.is_going;

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("event_detail.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{event.type === "walk" ? t("event_detail.walk_title") : t("event_detail.title")}</span>
        <span style={{ width: 44 }} />
      </div>

      <div className="detail-shell">
        <div className="card" style={{ borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <h2 style={{ fontWeight: 800, fontSize: 20, margin: "0 0 10px" }}>{event.title}</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-muted)" }}>
              <CalendarDays size={15} /> {formatDate(event.starts_at)}
            </span>
            {event.location && (
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-muted)" }}>
                <MapPin size={15} /> {event.location}
              </span>
            )}
            {event.pet_name && (
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-muted)" }}>
                <PawPrint size={15} /> {event.pet_name}
              </span>
            )}
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text-muted)" }}>
              <Users size={15} /> {event.participants_count}{event.capacity ? ` ${t("event_detail.going_of_capacity")} ${event.capacity}` : ""} {t("event_detail.going_suffix")}
            </span>
          </div>

          {event.description && (
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 14, whiteSpace: "pre-wrap" }}>
              {event.description}
            </p>
          )}

          <Link to={`/users/${event.organizer.id}`} style={{ fontSize: 13, color: "var(--text-faint)", display: "block", marginBottom: 14, textDecoration: "none" }}>
            {t("event_detail.organizer")} {event.organizer.display_name}
          </Link>

          {isAuthed && (
            <button
              className={event.is_going ? "btn btn-ghost btn-block" : "btn btn-primary btn-block"}
              onClick={toggle}
              disabled={busy || full}
            >
              {event.is_going ? <UserMinus size={16} /> : null}
              {event.is_going ? t("event_detail.not_going") : full ? t("event_detail.no_spots") : t("event_detail.join")}
            </button>
          )}
        </div>

        <h3 className="subhead" style={{ marginBottom: 10 }}>{t("event_detail.participants")}</h3>
        <div className="card-grid">
          {participants.map((p) => (
            <Link key={p.user.id} to={`/users/${p.user.id}`} className="card" style={{
              borderRadius: 16, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", background: "var(--primary-tint)", color: "#95491B",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, fontSize: 12, overflow: "hidden",
              }}>
                {p.user.avatar_url ? (
                  <img src={p.user.avatar_url} alt={p.user.display_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  p.user.display_name[0]?.toUpperCase()
                )}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{p.user.display_name}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
