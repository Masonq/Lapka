import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, MapPin, Users, Plus, PawPrint } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";

const TABS = [
  { value: "", label: "Все" },
  { value: "walk", label: "Прогулки" },
  { value: "event", label: "События" },
];

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) + ", " +
    d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export default function Events() {
  useDocumentTitle("События и прогулки");
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState("");
  const [events, setEvents] = useState(null);
  const [myPets, setMyPets] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "walk", title: "", location: "", starts_at: "", pet_id: "", capacity: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    api.events(tab ? { type: tab } : {}).then(setEvents).catch(() => setEvents([]));
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
      showToast(form.type === "walk" ? "Прогулка создана" : "Событие создано");
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
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">Прогулки и события</span>
        {isAuthed && (
          <button className="btn btn-ghost" onClick={() => setShowForm((v) => !v)} style={{ padding: "8px 12px" }}>
            <Plus size={16} />
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="card" style={{ borderRadius: 20, padding: 16, marginBottom: 16 }}>
          <div className="field">
            <label id="event-type-label">Тип</label>
            <div className="chip-row" role="group" aria-labelledby="event-type-label" style={{ paddingBottom: 2 }}>
              <button type="button" className={`chip${form.type === "walk" ? " active" : ""}`} onClick={() => setForm({ ...form, type: "walk" })}>
                Прогулка
              </button>
              <button type="button" className={`chip${form.type === "event" ? " active" : ""}`} onClick={() => setForm({ ...form, type: "event" })}>
                Событие
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor="event-title">Название</label>
            <input
              id="event-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              placeholder="Например: Вечерняя прогулка в Ушче"
            />
          </div>
          <div className="field">
            <label htmlFor="event-starts">Дата и время</label>
            <input
              id="event-starts"
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="event-location">Место встречи</label>
            <input
              id="event-location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="Необязательно"
            />
          </div>
          {form.type === "walk" && myPets.length > 0 && (
            <div className="field">
              <label id="event-pet-label">Питомец</label>
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
            <label htmlFor="event-capacity">Вместимость</label>
            <input
              id="event-capacity"
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              placeholder="Без ограничений"
            />
          </div>
          {error && <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>}
          <button className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Создаём…" : form.type === "walk" ? "Создать прогулку" : "Создать событие"}
          </button>
        </form>
      )}

      <div className="chip-row" style={{ marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.value} className={`chip${tab === t.value ? " active" : ""}`} onClick={() => setTab(t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      {events === null && <p style={{ fontSize: 13, color: "var(--text-faint)" }}>Загружаем…</p>}

      {events?.length === 0 && (
        <div className="empty-state">
          <CalendarDays size={28} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
          <div className="empty-state-title">Пока ничего не запланировано</div>
          {isAuthed ? "Создай первую прогулку или событие" : "Войди, чтобы создать своё"}
        </div>
      )}

      {events?.length > 0 && (
        <div className="card-grid">
          {events.map((ev) => (
            <Link key={ev.id} to={`/events/${ev.id}`} className="card" style={{ borderRadius: 20, padding: 16 }}>
              <span className="post-badge" style={{ background: "var(--gray-tint)", color: "var(--text-muted)" }}>
                {ev.type === "walk" ? "Прогулка" : "Событие"}
              </span>
              <h3 className="post-title" style={{ marginTop: 8 }}>{ev.title}</h3>
              <div className="post-meta" style={{ marginTop: 8 }}>
                <span className="post-meta-item"><CalendarDays size={13} /> {formatDate(ev.starts_at)}</span>
              </div>
              <div className="post-meta">
                {ev.location && <span className="post-meta-item"><MapPin size={13} /> {ev.location}</span>}
                {ev.pet_name && <span className="post-meta-item"><PawPrint size={13} /> {ev.pet_name}</span>}
                <span className="post-meta-item">
                  <Users size={13} /> {ev.participants_count}{ev.capacity ? `/${ev.capacity}` : ""}
                </span>
              </div>
              {ev.is_going && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green-strong)" }}>Ты идёшь</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
