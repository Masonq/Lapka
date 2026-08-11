import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../api/client";
import ListingCard from "../components/ListingCard";
import PostCardSkeleton from "../components/PostCardSkeleton";
import { useDelayedLoading } from "../useDelayedLoading";
import EmptyStateImage from "../components/EmptyStateImage";
import { useDocumentTitle } from "../useDocumentTitle";
import { useTranslation } from "react-i18next";

export default function SavedListings() {
  const { t } = useTranslation();
  useDocumentTitle(t("saved_listings.title"));
  const navigate = useNavigate();
  const [listings, setListings] = useState(null);
  const showSkeleton = useDelayedLoading(listings === null);

  useEffect(() => {
    api.savedListings().then(setListings).catch(() => setListings([]));
  }, []);

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("saved_listings.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("saved_listings.title")}</span>
        <span style={{ width: 44 }} />
      </div>

      {showSkeleton && (
        <div className="card-grid">
          <PostCardSkeleton />
          <PostCardSkeleton />
        </div>
      )}

      {!showSkeleton && listings?.length === 0 && (
        <div className="empty-state">
          <EmptyStateImage />
          <div className="empty-state-title">{t("saved_listings.empty_title")}</div>
          {t("saved_listings.empty_hint")}
        </div>
      )}

      {!showSkeleton && listings?.length > 0 && (
        <div className="card-grid">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
