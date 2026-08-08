import { useEffect, useState } from "react";
import { Star, Phone } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";

const TYPES = [
  { value: "", label: "Все" },
  { value: "sitter", label: "Ситтеры" },
  { value: "boarding", label: "Передержка" },
  { value: "trainer", label: "Кинологи" },
  { value: "vet", label: "Ветеринары" },
  { value: "groomer", label: "Грумеры" },
];

const TYPE_RU = {
  sitter: "Ситтер", boarding: "Передержка", trainer: "Кинолог", vet: "Ветеринар", groomer: "Грумер",
};

export default function Services() {
  const { isAuthed } = useAuth();
  const [providers, setProviders] = useState([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ service_type: "sitter", description: "", price_from: "", contact: "" });
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    api.services(filter ? { type: filter } : {})
      .then(setProviders)
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, [filter]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.becomeProvider({
        ...form,
        price_from: form.price_from ? Number(form.price_from) : undefined,
      });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div className="page-header">
        <span className="page-title">Услуги для питомцев</span>
        {isAuthed && (
          <button className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            Стать исполнителем
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="card" style={{ borderRadius: 20, padding: 16, marginBottom: 16 }}>
          <div className="field">
            <label>Вид услуги</label>
            <div className="chip-row" style={{ paddingBottom: 2 }}>
              {TYPES.filter((t) => t.value).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`chip${form.service_type === t.value ? " active" : ""}`}
                  onClick={() => setForm({ ...form, service_type: t.value })}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Описание</label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required placeholder="Опыт, район работы, что входит в услугу" />
          </div>
          <div className="field">
            <label>Цена от (динары)</label>
            <input type="number" min="0" value={form.price_from} onChange={(e) => setForm({ ...form, price_from: e.target.value })} placeholder="800" />
          </div>
          <div className="field">
            <label>Контакт (телефон/telegram)</label>
            <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="+381 6X XXX XXXX или @username" />
          </div>
          {error && <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>}
          <button className="btn btn-primary btn-block">Опубликовать анкету</button>
        </form>
      )}

      <div className="chip-row">
        {TYPES.map((t) => (
          <button
            key={t.value}
            className={`chip${filter === t.value ? " active" : ""}`}
            onClick={() => setFilter(t.value)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="empty-state">Загружаем список…</div>}

      {!loading && providers.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">Пока никого нет</div>
          Будь первым исполнителем в этой категории
        </div>
      )}

      {providers.map((p) => (
        <div key={p.id} className="card" style={{ borderRadius: 20, padding: 16, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span className="post-badge general">{TYPE_RU[p.service_type]}</span>
              <div className="subhead" style={{ marginTop: 6 }}>{p.user.display_name}</div>
            </div>
            {p.rating_count > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: "var(--yellow-strong)" }}>
                <Star size={14} fill="var(--yellow-strong)" strokeWidth={0} /> {p.rating_avg}
              </div>
            )}
          </div>
          <p style={{ fontSize: 14, color: "var(--text-muted)", margin: "8px 0" }}>{p.description}</p>
          <div className="post-meta">
            {p.price_from && <span>от {p.price_from} дин.</span>}
            {p.contact && (
              <span className="post-meta-item"><Phone size={13} /> {p.contact}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
