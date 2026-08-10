import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, MapPin, Bookmark, CheckCircle2, Trash2, MessageCircle, Flag } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import DetailCardSkeleton from "../components/DetailCardSkeleton";

const TYPE_LABELS = { sell: "Продажа", wanted: "Ищут", give_away: "Отдам даром" };

export default function ListingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthed, userId } = useAuth();
  const { showToast } = useToast();
  const [listing, setListing] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reported, setReported] = useState(false);

  useDocumentTitle(listing ? listing.title : "Объявление");

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
      showToast("Отмечено как продано");
      load();
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  async function remove() {
    try {
      await api.deleteListing(id);
      showToast("Объявление удалено");
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
      showToast("Жалоба отправлена");
    } catch (err) {
      showToast(err.message, "error");
    }
  }

  if (notFound) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Не найдено</div>
        Возможно, объявление удалили
      </div>
    );
  }

  if (!listing) {
    return (
      <div>
        <div className="page-header">
          <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
            <ArrowLeft size={17} strokeWidth={2.2} />
          </button>
          <span className="page-title">Объявление</span>
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
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">Объявление</span>
        <span style={{ width: 44 }} />
      </div>

      <div className="detail-shell">
        <div className="card" style={{ borderRadius: 20, padding: 20, marginBottom: 16, position: "relative" }}>
          {isAuthed && !isOwner && !reported && (
            <button className="post-save-btn" style={{ right: 12, top: 12 }} onClick={() => setShowReportForm((v) => !v)} aria-label="Пожаловаться">
              <Flag size={16} />
            </button>
          )}
          {reported && (
            <span className="post-save-btn" style={{ right: 12, top: 12, color: "var(--text-faint)" }} aria-label="Жалоба отправлена">
              <Flag size={16} />
            </span>
          )}
          {listing.photo_url && (
            <img src={listing.photo_url} alt={listing.title} className="post-card-photo" style={{ marginBottom: 14 }} />
          )}

          <span className="post-badge" style={{ background: "var(--gray-tint)", color: "var(--text-muted)" }}>
            {TYPE_LABELS[listing.type]}{listing.is_sold ? " · Продано" : ""}
          </span>

          <h2 style={{ fontWeight: 800, fontSize: 20, margin: "10px 0 4px" }}>{listing.title}</h2>

          {listing.price != null && (
            <div style={{ fontWeight: 800, fontSize: 22, margin: "4px 0 10px" }}>{listing.price} дин.</div>
          )}

          {listing.city && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>
              <MapPin size={14} /> {listing.city}
            </div>
          )}

          {listing.description && (
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 14 }}>
              {listing.description}
            </p>
          )}

          <Link to={`/users/${listing.seller.id}`} style={{ fontSize: 13, color: "var(--text-faint)", display: "block", marginBottom: 14, textDecoration: "none" }}>
            {listing.type === "wanted" ? "Ищет" : "Продавец"}: {listing.seller.display_name}
          </Link>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {isAuthed && !isOwner && (
              <>
                <Link to={`/messages/${listing.seller.id}`} className="btn btn-primary" style={{ flex: 1 }}>
                  <MessageCircle size={16} /> Написать
                </Link>
                <button className="btn btn-ghost" onClick={toggleSave} disabled={busy}>
                  <Bookmark size={16} fill={listing.is_saved ? "currentColor" : "none"} />
                </button>
              </>
            )}
            {isOwner && !listing.is_sold && listing.type === "sell" && (
              <button className="btn btn-ghost" onClick={markSold}>
                <CheckCircle2 size={16} /> Отметить проданным
              </button>
            )}
            {isOwner && (
              <button className="btn btn-ghost" style={{ color: "var(--red)" }} onClick={remove}>
                <Trash2 size={16} /> Удалить
              </button>
            )}
          </div>

          {showReportForm && (
            <form onSubmit={submitReport} style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              <textarea
                rows={2}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Что не так с объявлением? (необязательно)"
                style={{
                  width: "100%", border: "1px solid var(--border)", borderRadius: 12,
                  padding: "8px 12px", fontSize: 16, fontFamily: "var(--font-body)", marginBottom: 8, resize: "vertical",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary">Отправить жалобу</button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowReportForm(false)}>Отмена</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
