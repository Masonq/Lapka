import { useEffect, useState } from "react";
import { Search, MapPin, Users, CalendarDays, ShoppingBag, Heart } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import ServiceCardSkeleton from "../components/ServiceCardSkeleton";
import ProviderCard from "../components/ProviderCard";
import PostCard from "../components/PostCard";
import { useDocumentTitle } from "../useDocumentTitle";

const SERVICE_TYPES = [
  { value: "", label: "Все" },
  { value: "sitter", label: "Ситтеры" },
  { value: "boarding", label: "Передержка" },
  { value: "trainer", label: "Кинологи" },
  { value: "vet", label: "Ветеринары" },
  { value: "groomer", label: "Грумеры" },
];

const UPCOMING = [
  { icon: MapPin, label: "Рядом", desc: "Питомцы и заведения на карте поблизости" },
  { icon: Users, label: "Сообщества", desc: "Группы по породам и районам" },
  { icon: CalendarDays, label: "События и прогулки", desc: "Совместные выгулы и встречи" },
  { icon: Heart, label: "Приюты и пристройство", desc: "Питомцы, которым ищут дом" },
  { icon: ShoppingBag, label: "Барахолка", desc: "Купить/продать/отдать даром" },
];

export default function Explore() {
  useDocumentTitle("Обзор");
  const { isAuthed } = useAuth();
  const { showToast } = useToast();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const [providers, setProviders] = useState([]);
  const [serviceFilter, setServiceFilter] = useState("");
  const [loadingServices, setLoadingServices] = useState(true);
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [form, setForm] = useState({ service_type: "sitter", description: "", price_from: "", contact: "" });
  const [formError, setFormError] = useState("");

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
    api.posts({ q: debouncedQuery, limit: 20 })
      .then(setSearchResults)
      .catch(() => setSearchResults([]))
      .finally(() => setSearching(false));
  }, [debouncedQuery]);

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
        <span className="page-title">Обзор</span>
      </div>

      <div className="search-bar" style={{ marginBottom: 16 }}>
        <Search size={17} strokeWidth={2.2} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Искать посты, питомцев, район…"
          aria-label="Поиск по обзору"
        />
      </div>

      {isSearching ? (
        <>
          {searching && <p style={{ fontSize: 13, color: "var(--text-faint)" }}>Ищем…</p>}
          {!searching && searchResults?.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-title">Ничего не нашлось</div>
              Попробуй другой запрос
            </div>
          )}
          {!searching && searchResults?.length > 0 && (
            <div className="card-grid">
              {searchResults.map((post) => <PostCard key={post.id} post={post} />)}
            </div>
          )}
        </>
      ) : (
        <>
          <h3 className="subhead" style={{ marginBottom: 10 }}>Услуги для питомцев</h3>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div className="chip-row" style={{ padding: 0, flex: 1 }}>
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
              <button className="btn btn-ghost" style={{ marginLeft: 8, flexShrink: 0 }} onClick={() => setShowProviderForm((v) => !v)}>
                Стать исполнителем
              </button>
            )}
          </div>

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

          <h3 className="subhead" style={{ marginBottom: 10 }}>Скоро</h3>
          <div className="card-grid">
            {UPCOMING.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="card" style={{ borderRadius: 20, padding: 16, opacity: 0.7 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%", background: "var(--gray-tint)", color: "var(--text-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10,
                }}>
                  <Icon size={17} strokeWidth={2} />
                </div>
                <div className="subhead" style={{ fontSize: 14 }}>{label}</div>
                <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>{desc}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
