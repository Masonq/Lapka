import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

const TYPE_LABELS = {
  sell: "marketplace.type_sell", wanted: "marketplace.type_wanted", give_away: "marketplace.type_give_away",
};

export default function ListingCard({ listing: l }) {
  const { t } = useTranslation();
  return (
    <Link to={`/marketplace/${l.id}`} className="card" style={{ borderRadius: 20, padding: 16, display: "flex", flexDirection: "column", height: "100%" }}>
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
  );
}
