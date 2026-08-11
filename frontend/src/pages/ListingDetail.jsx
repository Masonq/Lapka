import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Bookmark, CheckCircle2, Trash2, MessageCircle, Flag } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import DetailCardSkeleton from "../components/DetailCardSkeleton";
import { useDelayedLoading } from "../useDelayedLoading";
import { useTranslation } from "react-i18next";

const TYPE_LABELS = { sell: "marketplace.type_sell", wanted: "marketplace.type_wanted", give_away: "marketplace.filter_give_away" };

export default function ListingDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthed, userId } = useAuth();
  const { showToast } = useToast();
  const [listing, setListing] = useState(null);
  const showSkeleton = useDelayedLoading(!listing);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reported, setReported] = useState(false);

  useDocumentTitle(listing ? listing.title : t("listing_detail.title"));

  function load() {
    api.listing(id).then(setListing).catch(() => setNotFound(true));
  }

  useEffect(load, [id]);

  async function toggleSave() {
    setBusy(true);
    try {
      if (listing.is_saved) await api.unsaveListing(id);
      else await api.saveListing(id);
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function markSold() {
    try {
      await api.markListingSold(id);
      showToast(t("listing_detail.sold_toast"));
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function remove() {
    try {
      await api.deleteListing(id);
      showToast(t("listing_detail.deleted_toast"));
      navigate("/marketplace");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function submitReport(e) {
    e.preventDefault();
    try {
      await api.reportListing(id, reportReason.trim() || undefined);
      setReported(true);
      setShowReportForm(false);
      showToast(t("listing_detail.report_sent_toast"));
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  if (notFound) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">{t("listing_detail.not_found_title")}</div>
        {t("listing_detail.not_found_hint")}
      </div>
    );
  }

  if (!listing) {
    if (!showSkeleton) return null;
    return (
      <div>
        <div className="page-header">
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("listing_detail.back_aria")}>
            <ArrowLeft size={17} strokeWidth={2.2} />
          </button>
          <span className="page-title">{t("listing_detail.title")}</span>
          <span style={{ width: 44 }} />
        </div>
        <div className="detail-shell">
          <DetailCardSkeleton withPhoto />
        </div>
      </div>
    );
  }

  const isOwner = listing.seller.id === userId;

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("listing_detail.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("listing_detail.title")}</span>
        <span style={{ width: 44 }} />
      </div>

      <div className="detail-shell">
        <div className="card" style={{ borderRadius: 20, padding: 20, marginBottom: 16, position: "relative" }}>
          {isAuthed && !isOwner && !reported && (
            <button className="post-save-btn" style={{ right: 12, top: 12 }} onClick={() => setShowReportForm((v) => !v)} aria-label={t("listing_detail.report_aria")}>
              <Flag size={16} />
            </button>
          )}
          {reported && (
            <span className="post-save-btn" style={{ right: 12, top: 12, color: "var(--text-faint)" }} aria-label={t("listing_detail.report_sent_aria")}>
              <Flag size={16} />
            </span>
          )}
          {listing.photo_url && (
            <img src={listing.photo_url} alt={listing.title} className="post-card-photo" style={{ marginBottom: 14 }} />
          )}

          <span className="post-badge" style={{ background: "var(--gray-tint)", color: "var(--text-muted)" }}>
            {t(TYPE_LABELS[listing.type])}{listing.is_sold ? t("listing_detail.sold_suffix") : ""}
          </span>

          <h2 style={{ fontWeight: 800, fontSize: 20, margin: "10px 0 4px" }}>{listing.title}</h2>

          {listing.price != null && (
            <div style={{ fontWeight: 800, fontSize: 22, margin: "4px 0 10px" }}>{t("listing_detail.price_din", { price: listing.price })}</div>
          )}

          {listing.city && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>
              <MapPin size={14} /> {listing.city}
            </div>
          )}

          {listing.description && (
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 14, whiteSpace: "pre-wrap" }}>
              {listing.description}
            </p>
          )}

          <Link to={`/users/${listing.seller.id}`} style={{ fontSize: 13, color: "var(--text-faint)", display: "block", marginBottom: 14, textDecoration: "none" }}>
            {listing.type === "wanted" ? t("listing_detail.wanted_by") : t("listing_detail.seller")}: {listing.seller.display_name}
          </Link>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {isAuthed && !isOwner && (
              <>
                <Link to={`/messages/${listing.seller.id}`} className="btn btn-primary" style={{ flex: 1 }}>
                  <MessageCircle size={16} /> {t("listing_detail.write")}
                </Link>
                <button className="btn btn-ghost" onClick={toggleSave} disabled={busy}>
                  <Bookmark size={16} fill={listing.is_saved ? "currentColor" : "none"} />
                </button>
              </>
            )}
            {isOwner && !listing.is_sold && listing.type === "sell" && (
              <button className="btn btn-ghost" onClick={markSold}>
                <CheckCircle2 size={16} /> {t("listing_detail.mark_sold")}
              </button>
            )}
            {isOwner && (
              <button className="btn btn-ghost" style={{ color: "var(--red)" }} onClick={remove}>
                <Trash2 size={16} /> {t("listing_detail.delete")}
              </button>
            )}
          </div>

          {showReportForm && (
            <form onSubmit={submitReport} style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <textarea
                rows={2}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder={t("listing_detail.report_placeholder")}
                autoComplete="off"
                style={{
                  width: "100%", border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", color: "var(--text)",
                  padding: "8px 12px", fontSize: 16, fontFamily: "var(--font-body)", marginBottom: 8, resize: "vertical",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary">{t("listing_detail.send_report")}</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowReportForm(false)}>{t("listing_detail.cancel")}</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
