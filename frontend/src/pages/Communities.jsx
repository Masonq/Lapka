import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Users, Plus } from "lucide-react";
import ListItemSkeleton from "../components/ListItemSkeleton";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import { useSearchContext } from "../SearchContext";
import { pluralize } from "../pluralize";

export default function Communities() {
  useDocumentTitle("Сообщества");
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const { showToast } = useToast();
  const { setSearchConfig } = useSearchContext();
  const [communities, setCommunities] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", city: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoadError(false);
    api.communities(query ? { q: query } : {}).then(setCommunities).catch(() => setLoadError(true));
  }

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    setSearchConfig({ value: query, onChange: setQuery, placeholder: "Искать сообщества…" });
    return () => setSearchConfig(null);
  }, [query, setSearchConfig]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const community = await api.createCommunity(form);
      showToast("Сообщество создано");
      navigate(`/communities/${community.id}`);
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
        <span className="page-title">Сообщества</span>
        {isAuthed ? (
          <button className="icon-btn" onClick={() => setShowForm((v) => !v)} aria-label="Создать сообщество">
            <Plus size={17} strokeWidth={2.2} />
          </button>
        ) : (
          <span style={{ width: 44 }} />
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="card" style={{ borderRadius: 20, padding: 16, marginBottom: 16 }}>
          <div className="field">
            <label htmlFor="community-name">Название</label>
            <input
              id="community-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Например: Французские бульдоги Белграда"
            />
          </div>
          <div className="field">
            <label htmlFor="community-description">Описание</label>
            <textarea
              id="community-description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="О чём сообщество, для кого"
            />
          </div>
          <div className="field">
            <label htmlFor="community-city">Город</label>
            <input
              id="community-city"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Необязательно"
            />
          </div>
          {error && <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>}
          <button className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Создаём…" : "Создать сообщество"}
          </button>
        </form>
      )}

      {communities === null && !loadError && <ListItemSkeleton />}

      {loadError && <ErrorState onRetry={load} />}

      {communities?.length === 0 && (
        <div className="empty-state">
          <Users size={28} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
          <div className="empty-state-title">Пока никого нет</div>
          {isAuthed ? "Создай первое сообщество" : "Войди, чтобы создать своё"}
        </div>
      )}

      {communities?.length > 0 && (
        <div className="card-grid">
          {communities.map((c) => (
            <Link key={c.id} to={`/communities/${c.id}`} className="card" style={{
              borderRadius: 20, padding: 16, display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%", background: "var(--primary-tint)", color: "#95491B",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, overflow: "hidden",
              }}>
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  c.name[0]?.toUpperCase()
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="subhead" style={{ fontSize: 15 }}>{c.name}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {c.members_count} {pluralize(c.members_count, ["участник", "участника", "участников"])}
                  {c.city ? ` · ${c.city}` : ""}
                </div>
              </div>
              {c.is_member && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--green-strong)", flexShrink: 0 }}>
                  Ты в клубе
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
