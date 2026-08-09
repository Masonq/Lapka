import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, CalendarDays, ShoppingBag, Heart, ChevronRight, PawPrint } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import ServiceCardSkeleton from "../components/ServiceCardSkeleton";
import ProviderCard from "../components/ProviderCard";
import PostCard from "../components/PostCard";
import { useDocumentTitle } from "../useDocumentTitle";
import { pluralize } from "../pluralize";

const SERVICE_TYPES = [
  { value: "", label: "Все" },
  { value: "sitter", label: "Ситтеры" },
  { value: "boarding", label: "Передержка" },
  { value: "trainer", label: "Кинологи" },
  { value: "vet", label: "Ветеринары" },
  { value: "groomer", label: "Грумеры" },
];

const SEARCH_TABS = [
  { value: "posts", label: "Посты" },
  { value: "people", label: "Люди" },
  { value: "pets", label: "Питомцы" },
  { value: "communities", label: "Сообщества" },
  { value: "events", label: "События" },
];

export default function Explore() {
  useDocumentTitle("Поиск");
  const { isAuthed } = useAuth();
  const { showToast } = useToast();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchTab, setSearchTab] = useState("posts");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const [providers, setProviders] = useState([]);
  const [serviceFilter, setServiceFilter] = useState("");
  const [loadingServices, setLoadingServices] = useState(true);
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [form, setForm] = useState({ service_type: "sitter", description: "", price_from: "", contact: "" });
  const [formError, setFormError] = useState("");

  const [communities, setCommunities] = useState([]);

  useEffect(() => {
    api.communities().then((list) => setCommunities(list.slice(0, 3))).catch(() => setCommunities([]));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!debouncedQuery) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    const searchers = {
      posts: () => api.posts({ q: debouncedQuery, limit: 20 }),
      people: () => api.users({ q: debouncedQuery, limit: 20 }),
      pets: () => api.pets({ q: debouncedQuery, limit: 20 }),
      communities: () => api.communities({ q: debouncedQuery }),
      events: () => api.events({ q: debouncedQuery, limit: 20 }),
    };
    searchers[searchTab]()
      .then(setSearchResults)
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [debouncedQuery, searchTab]);

  function loadServices() {
    setLoadingServices(true);
    api.services(serviceFilter ? { type: serviceFilter } : {})
      .then(setProviders)
      .catch(() => setProviders([]))
      .finally(() => setLoadingServices(false));
  }

  useEffect(loadServices, [serviceFilter]);

  async function submitProvider(e) {
    e.preventDefault();
    setFormError("");
    try {
      await api.becomeProvider({
        ...form,
        price_from: form.price_from ? Number(form.price_from) : undefined,
      });
      setShowProviderForm(false);
      showToast("Анкета опубликована");
      loadServices();
    } catch (err) {
      setFormError(err.message);
      showToast(err.message, "error");
    }
  }

  const isSearching = debouncedQuery.length > 0;

  return (
    <div>
      <div className="page-header">
        <span className="page-title">Поиск</span>
      </div>

      <div className="search-bar" style={{ marginBottom: isSearching ? 12 : 16 }}>
        <Search size={17} strokeWidth={2.2} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Искать людей, питомцев, посты, сообщества…"
          aria-label="Поиск"
        />
      </div>

      {isSearching && (
        <div className="chip-row" style={{ marginBottom: 16 }}>
          {SEARCH_TABS.map((t) => (
            <button key={t.value} className={`chip${searchTab === t.value ? " active" : ""}`} onClick={() => setSearchTab(t.value)}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {isSearching ? (
        <>
          {searching && <p style={{ fontSize: 13, color: "var(--text-faint)" }}>Ищем…</p>}

          {!searching && searchResults?.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-title">Ничего не нашлось</div>
              Попробуй другой запрос или вкладку
            </div>
          )}

          {!searching && searchResults?.length > 0 && searchTab === "posts" && (
            <div className="card-grid">
              {searchResults.map((post) => <PostCard key={post.id} post={post} />)}
            </div>
          )}

          {!searching && searchResults?.length > 0 && searchTab === "people" && (
            <div className="card-grid">
              {searchResults.map((u) => (
                <Link key={u.id} to={`/users/${u.id}`} className="card" style={{
                  borderRadius: 20, padding: 16, display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", background: "var(--primary-tint)", color: "#95491B",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, overflow: "hidden",
                  }}>
                    {u.avatar_url ? (
                      <img src={u.avatar_url} alt={u.display_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      u.display_name[0]?.toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="subhead" style={{ fontSize: 14 }}>{u.display_name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{u.city}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!searching && searchResults?.length > 0 && searchTab === "pets" && (
            <div className="card-grid">
              {searchResults.map((pet) => (
                <Link key={pet.id} to={`/pets/${pet.id}`} className="card" style={{
                  borderRadius: 20, padding: 16, display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", background: "var(--blue-tint)", color: "var(--blue)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden",
                  }}>
                    {pet.avatar_url ? (
                      <img src={pet.avatar_url} alt={`Фото ${pet.name}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <PawPrint size={18} strokeWidth={2.2} />
                    )}
                  </div>
                  <div>
                    <div className="subhead" style={{ fontSize: 14 }}>{pet.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{pet.species}{pet.breed ? `, ${pet.breed}` : ""}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!searching && searchResults?.length > 0 && searchTab === "communities" && (
            <div className="card-grid">
              {searchResults.map((c) => (
                <Link key={c.id} to={`/communities/${c.id}`} className="card" style={{
                  borderRadius: 20, padding: 16, display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", background: "var(--primary-tint)", color: "#95491B",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, overflow: "hidden",
                  }}>
                    {c.avatar_url ? (
                      <img src={c.avatar_url} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      c.name[0]?.toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="subhead" style={{ fontSize: 14 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.members_count} {pluralize(c.members_count, ["участник", "участника", "участников"])}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!searching && searchResults?.length > 0 && searchTab === "events" && (
            <div className="card-grid">
              {searchResults.map((ev) => (
                <Link key={ev.id} to={`/events/${ev.id}`} className="card" style={{ borderRadius: 20, padding: 16 }}>
                  <span className="post-badge" style={{ background: "var(--gray-tint)", color: "var(--text-muted)" }}>
                    {ev.type === "walk" ? "Прогулка" : "Событие"}
                  </span>
                  <h3 className="post-title" style={{ marginTop: 8, fontSize: 15 }}>{ev.title}</h3>
                  {ev.location && (
                    <div className="post-meta"><span className="post-meta-item" style={{ minWidth: 0 }}><MapPin size={13} /> <span className="post-meta-text">{ev.location}</span></span></div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <Link to="/nearby" className="card" style={{
            borderRadius: 20, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: "var(--blue-tint)", color: "var(--blue)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <MapPin size={17} strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="subhead" style={{ fontSize: 14 }}>Рядом</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Питомцы в твоём городе</div>
            </div>
            <ChevronRight size={17} style={{ color: "var(--text-faint)" }} />
          </Link>

          <Link to="/events" className="card" style={{
            borderRadius: 20, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: "var(--green-tint)", color: "var(--green-strong)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <CalendarDays size={17} strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="subhead" style={{ fontSize: 14 }}>Прогулки и события</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Совместные выгулы и встречи</div>
            </div>
            <ChevronRight size={17} style={{ color: "var(--text-faint)" }} />
          </Link>

          <Link to="/marketplace" className="card" style={{
            borderRadius: 20, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: "var(--primary-tint)", color: "#95491B",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <ShoppingBag size={17} strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="subhead" style={{ fontSize: 14 }}>Барахолка</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Купить, продать, отдать даром</div>
            </div>
            <ChevronRight size={17} style={{ color: "var(--text-faint)" }} />
          </Link>

          <Link to="/adoption" className="card" style={{
            borderRadius: 20, padding: 16, marginBottom: 20, display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", background: "var(--red-tint)", color: "var(--red)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Heart size={17} strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="subhead" style={{ fontSize: 14 }}>Приюты и пристройство</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Питомцы, которым ищут дом</div>
            </div>
            <ChevronRight size={17} style={{ color: "var(--text-faint)" }} />
          </Link>

          {communities.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <h3 className="subhead" style={{ margin: 0 }}>Сообщества</h3>
                <Link to="/communities" style={{ display: "flex", alignItems: "center", fontSize: 13, color: "var(--text-muted)", textDecoration: "none" }}>
                  Все <ChevronRight size={14} />
                </Link>
              </div>
              <div className="card-grid" style={{ marginBottom: 24 }}>
                {communities.map((c) => (
                  <Link key={c.id} to={`/communities/${c.id}`} className="card" style={{
                    borderRadius: 20, padding: 14, display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: "50%", background: "var(--primary-tint)", color: "#95491B",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, fontSize: 13,
                    }}>
                      {c.name[0]?.toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="subhead" style={{ fontSize: 13 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.members_count} {pluralize(c.members_count, ["участник", "участника", "участников"])}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}

          <h3 className="subhead" style={{ marginBottom: 10 }}>Услуги для питомцев</h3>

          <div className="chip-row" style={{ padding: 0, marginBottom: 10 }}>
            {SERVICE_TYPES.map((t) => (
              <button
                key={t.value}
                className={`chip${serviceFilter === t.value ? " active" : ""}`}
                onClick={() => setServiceFilter(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {isAuthed && (
            <button className="btn btn-ghost btn-block" style={{ marginBottom: 10 }} onClick={() => setShowProviderForm((v) => !v)}>
              Стать исполнителем
            </button>
          )}

          {showProviderForm && (
            <form onSubmit={submitProvider} className="card" style={{ borderRadius: 20, padding: 16, marginBottom: 16 }}>
              <div className="field">
                <label id="explore-service-type-label">Вид услуги</label>
                <div className="chip-row" role="group" aria-labelledby="explore-service-type-label" style={{ paddingBottom: 2 }}>
                  {SERVICE_TYPES.filter((t) => t.value).map((t) => (
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
                <label htmlFor="explore-service-description">Описание</label>
                <textarea id="explore-service-description" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required placeholder="Опыт, район работы, что входит в услугу" />
              </div>
              <div className="field">
                <label htmlFor="explore-service-price">Цена от (динары)</label>
                <input id="explore-service-price" type="number" min="0" value={form.price_from} onChange={(e) => setForm({ ...form, price_from: e.target.value })} placeholder="800" />
              </div>
              <div className="field">
                <label htmlFor="explore-service-contact">Контакт (телефон/telegram)</label>
                <input id="explore-service-contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} placeholder="+381 6X XXX XXXX или @username" />
              </div>
              {formError && <p style={{ color: "var(--red)", fontSize: 13 }}>{formError}</p>}
              <button className="btn btn-primary btn-block">Опубликовать анкету</button>
            </form>
          )}

          {loadingServices && (
            <div className="card-grid" style={{ marginBottom: 24 }}>
              <ServiceCardSkeleton />
              <ServiceCardSkeleton />
            </div>
          )}

          {!loadingServices && providers.length === 0 && (
            <div className="empty-state" style={{ padding: "24px 20px" }}>
              Пока никого нет в этой категории
            </div>
          )}

          {!loadingServices && providers.length > 0 && (
            <div className="card-grid" style={{ marginBottom: 24 }}>
              {providers.map((p) => <ProviderCard key={p.id} provider={p} onReviewed={loadServices} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
