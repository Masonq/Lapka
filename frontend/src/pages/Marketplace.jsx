import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus, MapPin } from "lucide-react";
import PostCardSkeleton from "../components/PostCardSkeleton";
import { useDelayedLoading } from "../useDelayedLoading";
import EmptyStateImage from "../components/EmptyStateImage";
import ErrorState from "../components/ErrorState";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useDocumentTitle } from "../useDocumentTitle";
import { useTranslation } from "react-i18next";

const TYPES = [
  { value: "", label: "marketplace.filter_all" },
  { value: "sell", label: "marketplace.filter_sell" },
  { value: "wanted", label: "marketplace.filter_wanted" },
  { value: "give_away", label: "marketplace.filter_give_away" },
];

const TYPE_LABELS = {
  sell: "marketplace.type_sell", wanted: "marketplace.type_wanted", give_away: "marketplace.type_give_away",
};

export default function Marketplace() {
  const { t } = useTranslation();
  useDocumentTitle(t("marketplace.title"));
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const [type, setType] = useState("");
  const [listings, setListings] = useState(null);
  const showSkeleton = useDelayedLoading(listings === null);
  const [loadError, setLoadError] = useState(false);

  function load() {
    setLoadError(false);
    api.listings(type ? { type } : {}).then(setListings).catch(() => setLoadError(true));
  }

  useEffect(load, [type]);

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("marketplace.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("marketplace.title")}</span>
        {isAuthed ? (
          <Link to="/marketplace/new" className="icon-btn" aria-label={t("marketplace.add_aria")}>
            <Plus size={17} strokeWidth={2.2} />
          </Link>
        ) : (
          <span style={{ width: 44 }} />
        )}
      </div>

      <div className="chip-row" style={{ marginBottom: 16 }}>
        {TYPES.map((tp) => (
          <button key={tp.value} className={`chip${type === tp.value ? " active" : ""}`} onClick={() => setType(tp.value)}>
            {t(tp.label)}
          </button>
        ))}
      </div>

      {showSkeleton && !loadError && <div className="card-grid"><PostCardSkeleton /><PostCardSkeleton /></div>}

      {loadError && <ErrorState onRetry={load} />}

      {!loadError && listings?.length === 0 && (
        <div className="empty-state">
          <EmptyStateImage />
          <div className="empty-state-title">{t("marketplace.empty_title")}</div>
          {isAuthed ? t("marketplace.empty_authed") : t("marketplace.empty_guest")}
        </div>
      )}

      {!loadError && listings?.length > 0 && (
        <div className="card-grid">
          {listings.map((l) => (
            <Link key={l.id} to={`/marketplace/${l.id}`} className="card" style={{ borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", height: "100%" }}>
              {l.photo_url && (
                <img src={l.photo_url} alt={l.title} className="post-card-photo" />
              )}
              <span className="post-badge" style={{ background: "var(--gray-tint)", color: "var(--text-muted)" }}>
                {t(TYPE_LABELS[l.type])}
              </span>
              <h3 className="post-title" style={{ marginTop: 8 }}>{l.title}</h3>
              {l.price != null && (
                <div style={{ fontWeight: 800, fontSize: 16, margin: "4px 0" }}>{t("marketplace.price_din", { price: l.price })}</div>
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
