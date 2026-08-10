import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, MapPin, Users, Plus, PawPrint } from "lucide-react";
import PostCardSkeleton from "../components/PostCardSkeleton";
import { useDelayedLoading } from "../useDelayedLoading";
import EmptyStateImage from "../components/EmptyStateImage";
import ErrorState from "../components/ErrorState";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import { useTranslation } from "react-i18next";

const TABS = [
  { value: "", labelKey: "events.filter_all" },
  { value: "walk", labelKey: "events.filter_walk" },
  { value: "event", labelKey: "events.filter_event" },
];

export default function Events() {
  const { t, i18n } = useTranslation();
  useDocumentTitle(t("events.title"));
  const navigate = useNavigate();

  function formatDate(iso) {
    const d = new Date(iso);
    const locale = i18n.language === "sr" ? "sr-Latn-RS" : "ru-RU";
    return d.toLocaleDateString(locale, { day: "numeric", month: "long" }) + ", " +
      d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }
  const { isAuthed } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState("");
  const [events, setEvents] = useState(null);
  const showSkeleton = useDelayedLoading(events === null);
  const [loadError, setLoadError] = useState(false);
  const [myPets, setMyPets] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "walk", title: "", location: "", starts_at: "", pet_id: "", capacity: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoadError(false);
    api.events(tab ? { type: tab } : {}).then(setEvents).catch(() => setLoadError(true));
  }

  useEffect(load, [tab]);

  useEffect(() => {
    if (isAuthed) api.myPets().then(setMyPets).catch(() => setMyPets([]));
  }, [isAuthed]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const event = await api.createEvent({
        ...form,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : undefined,
        pet_id: form.pet_id || undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      });
      showToast(form.type === "walk" ? t("events.walk_created_toast") : t("events.event_created_toast"));
      navigate(`/events/${event.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("events.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("events.page_title")}</span>
        {isAuthed ? (
          <button className="icon-btn" onClick={() => setShowForm((v) => !v)} aria-label={t("events.create_aria")}>
            <Plus size={17} strokeWidth={2.2} />
          </button>
        ) : (
          <span style={{ width: 44 }} />
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="card" style={{ borderRadius: 20, padding: 16, marginBottom: 16 }}>
          <div className="field">
            <label id="event-type-label">{t("events.type_label")}</label>
            <div className="chip-row" role="group" aria-labelledby="event-type-label" style={{ paddingBottom: 2 }}>
              <button type="button" className={`chip${form.type === "walk" ? " active" : ""}`} onClick={() => setForm({ ...form, type: "walk" })}>
                {t("events.walk_chip")}
              </button>
              <button type="button" className={`chip${form.type === "event" ? " active" : ""}`} onClick={() => setForm({ ...form, type: "event" })}>
                {t("events.event_chip")}
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor="event-title">{t("events.name_label")}</label>
            <input
              id="event-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder={t("events.name_placeholder")}
            />
          </div>
          <div className="field">
            <label htmlFor="event-starts">{t("events.datetime_label")}</label>
            <input
              id="event-starts"
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="event-location">{t("events.location_label")}</label>
            <input
              id="event-location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder={t("events.location_placeholder")}
            />
          </div>
          {form.type === "walk" && myPets.length > 0 && (
            <div className="field">
              <label id="event-pet-label">{t("events.pet_label")}</label>
              <div className="chip-row" role="group" aria-labelledby="event-pet-label" style={{ paddingBottom: 2 }}>
                {myPets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`chip${form.pet_id === p.id ? " active" : ""}`}
                    onClick={() => setForm({ ...form, pet_id: form.pet_id === p.id ? "" : p.id })}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="field">
            <label htmlFor="event-capacity">{t("events.capacity_label")}</label>
            <input
              id="event-capacity"
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              placeholder={t("events.capacity_placeholder")}
            />
          </div>
          {error && <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>}
          <button className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? t("events.creating") : form.type === "walk" ? t("events.create_walk") : t("events.create_event")}
          </button>
        </form>
      )}

      <div className="chip-row" style={{ marginBottom: 16 }}>
        {TABS.map((tb) => (
          <button key={tb.value} className={`chip${tab === tb.value ? " active" : ""}`} onClick={() => setTab(tb.value)}>
            {t(tb.labelKey)}
          </button>
        ))}
      </div>

      {showSkeleton && !loadError && <div className="card-grid"><PostCardSkeleton /><PostCardSkeleton /></div>}

      {loadError && <ErrorState onRetry={load} />}

      {!loadError && events?.length === 0 && (
        <div className="empty-state">
          <EmptyStateImage />
          <div className="empty-state-title">{t("events.empty_title")}</div>
          {isAuthed ? t("events.empty_authed") : t("events.empty_guest")}
        </div>
      )}

      {!loadError && events?.length > 0 && (
        <div className="card-grid">
          {events.map((ev) => (
            <Link key={ev.id} to={`/events/${ev.id}`} className="card" style={{ borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", height: "100%" }}>
              <span className="post-badge" style={{ background: "var(--gray-tint)", color: "var(--text-muted)" }}>
                {ev.type === "walk" ? t("events.walk_chip") : t("events.event_chip")}
              </span>
              <h3 className="post-title" style={{ marginTop: 8 }}>{ev.title}</h3>
              <div className="post-meta" style={{ marginTop: 8 }}>
                <span className="post-meta-item"><CalendarDays size={13} /> {formatDate(ev.starts_at)}</span>
              </div>
              <div className="post-meta">
                {ev.location && <span className="post-meta-item" style={{ minWidth: 0 }}><MapPin size={13} /> <span className="post-meta-text" title={ev.location}>{ev.location}</span></span>}
                {ev.pet_name && <span className="post-meta-item" style={{ minWidth: 0 }}><PawPrint size={13} /> <span className="post-meta-text" title={ev.pet_name}>{ev.pet_name}</span></span>}
                <span className="post-meta-item" style={{ flexShrink: 0 }}>
                  <Users size={13} /> {ev.participants_count}{ev.capacity ? `/${ev.capacity}` : ""}
                </span>
              </div>
              {ev.is_going && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green-strong)" }}>{t("events.going_badge")}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
