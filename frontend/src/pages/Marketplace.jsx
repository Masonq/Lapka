import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ShoppingBag, Plus, MapPin } from "lucide-react";
import PostCardSkeleton from "../components/PostCardSkeleton";
import ErrorState from "../components/ErrorState";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useDocumentTitle } from "../useDocumentTitle";

const TYPES = [
  { value: "", label: "Всё" },
  { value: "sell", label: "Продажа" },
  { value: "wanted", label: "Ищут" },
  { value: "give_away", label: "Отдам даром" },
];

const TYPE_LABELS = { sell: "Продажа", wanted: "Ищут", give_away: "Даром" };

export default function Marketplace() {
  useDocumentTitle("Барахолка");
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const [type, setType] = useState("");
  const [listings, setListings] = useState(null);
  const [loadError, setLoadError] = useState(false);

  function load() {
    setLoadError(false);
    api.listings(type ? { type } : {}).then(setListings).catch(() => setLoadError(true));
  }

  useEffect(load, [type]);

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">Барахолка</span>
        {isAuthed ? (
          <Link to="/marketplace/new" className="icon-btn" aria-label="Разместить объявление">
            <Plus size={17} strokeWidth={2.2} />
          </Link>
        ) : (
          <span style={{ width: 44 }} />
        )}
      </div>

      <div className="chip-row" style={{ marginBottom: 16 }}>
        {TYPES.map((t) => (
          <button key={t.value} className={`chip${type === t.value ? " active" : ""}`} onClick={() => setType(t.value)}>
            {t.label}
          </button>
        ))}
      </div>

      {listings === null && !loadError && <div className="card-grid"><PostCardSkeleton /><PostCardSkeleton /></div>}

      {loadError && <ErrorState onRetry={load} />}

      {listings?.length === 0 && (
        <div className="empty-state">
          <ShoppingBag size={28} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
          <div className="empty-state-title">Пока пусто</div>
          {isAuthed ? "Разместите первое объявление" : "Войди, чтобы разместить объявление"}
        </div>
      )}

      {listings?.length > 0 && (
        <div className="card-grid">
          {listings.map((l) => (
            <Link key={l.id} to={`/marketplace/${l.id}`} className="card" style={{ borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", height: "100%" }}>
              {l.photo_url && (
                <img src={l.photo_url} alt={l.title} className="post-card-photo" />
              )}
              <span className="post-badge" style={{ background: "var(--gray-tint)", color: "var(--text-muted)" }}>
                {TYPE_LABELS[l.type]}
              </span>
              <h3 className="post-title" style={{ marginTop: 8 }}>{l.title}</h3>
              {l.price != null && (
                <div style={{ fontWeight: 800, fontSize: 16, margin: "4px 0" }}>{l.price} дин.</div>
              )}
              <div className="post-meta">
                {l.city && <span className="post-meta-item" style={{ minWidth: 0 }}><MapPin size={13} /> <span className="post-meta-text" title={l.city}>{l.city}</span></span>}
                <span className="post-meta-text" style={{ marginLeft: "auto" }} title={l.seller.display_name}>{l.seller.display_name}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
