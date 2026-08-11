import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import PostCardSkeleton from "../components/PostCardSkeleton";
import ListingCard from "../components/ListingCard";
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

      {!showSkeleton && loadError && <ErrorState onRetry={load} />}

      {!showSkeleton && !loadError && listings?.length === 0 && (
        <div className="empty-state">
          <EmptyStateImage />
          <div className="empty-state-title">{t("marketplace.empty_title")}</div>
          {isAuthed ? t("marketplace.empty_authed") : t("marketplace.empty_guest")}
        </div>
      )}

      {!showSkeleton && !loadError && listings?.length > 0 && (
        <div className="card-grid">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
