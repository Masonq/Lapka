import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, MapPin, LoaderCircle } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useAutoResizeTextarea } from "../useAutoResizeTextarea";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import PhotoPicker from "../components/PhotoPicker";
import { useTranslation } from "react-i18next";

const TYPES = [
  { value: "lost", labelKey: "new_post.type_lost" },
  { value: "found", labelKey: "new_post.type_found" },
  { value: "adopt", labelKey: "new_post.type_adopt" },
  { value: "question", labelKey: "new_post.type_question" },
  { value: "general", labelKey: "new_post.type_general" },
];

export default function NewPost() {
  const { t } = useTranslation();
  useDocumentTitle(t("new_post.title"));
  const { isAuthed } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = TYPES.some((t) => t.value === searchParams.get("type")) ? searchParams.get("type") : "lost";
  const communityId = searchParams.get("community_id") || undefined;
  const [type, setType] = useState(initialType);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const bodyRef = useAutoResizeTextarea(body);
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [locatingMe, setLocatingMe] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [photoUrl, setPhotoUrl] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [showStaffBadge, setShowStaffBadge] = useState(true);

  useEffect(() => {
    if (isAuthed) api.me().then((me) => setIsStaff(me.is_staff)).catch(() => {});
  }, [isAuthed]);

  if (!isAuthed) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">{t("new_post.login_required_title")}</div>
        {t("new_post.login_required_hint")}
        <div style={{ marginTop: 16 }}>
          <button className="btn btn-primary" onClick={() => navigate("/profile")}>
            {t("new_post.login_button")}
          </button>
        </div>
      </div>
    );
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationError(t("new_post.geo_not_supported"));
      return;
    }
    setLocatingMe(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocatingMe(false);
      },
      () => {
        setLocationError(t("new_post.geo_failed"));
        setLocatingMe(false);
      },
      { timeout: 10000 }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const post = await api.createPost({
        type,
        title,
        body,
        photo_url: photoUrl || undefined,
        last_seen_location: location || undefined,
        last_seen_lat: lat || undefined,
        last_seen_lng: lng || undefined,
        community_id: communityId,
        show_staff_badge: showStaffBadge,
      });
      showToast(t("new_post.published_toast"));
      navigate(`/posts/${post.id}`);
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  const needsLocation = type === "lost" || type === "found";

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("new_post.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("new_post.title")}</span>
        <span style={{ width: 44 }} />
      </div>

      <div className="detail-shell">
        <div className="field">
          <label id="post-type-label">{t("new_post.post_type_label")}</label>
          <div className="chip-row" role="group" aria-labelledby="post-type-label" style={{ paddingBottom: 2 }}>
            {TYPES.map((tp) => (
              <button
                key={tp.value}
                type="button"
                className={`chip${type === tp.value ? " active" : ""}`}
                onClick={() => setType(tp.value)}
              >
                {t(tp.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ borderRadius: 20, padding: 18 }}>
        <PhotoPicker value={photoUrl} onChange={setPhotoUrl} label={t("new_post.photo_label")} />

        <div className="field">
          <label htmlFor="post-title">{t("new_post.title_label")}</label>
          <input
            id="post-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            placeholder={t("new_post.title_placeholder")}
            autoComplete="off"
          />
        </div>

        <div className="field">
          <label htmlFor="post-body">{t("new_post.description_label")}</label>
          <textarea
            id="post-body"
            ref={bodyRef}
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            placeholder={t("new_post.description_placeholder")}
            autoComplete="off"
            style={{ overflow: "hidden", resize: "none" }}
          />
        </div>

        {needsLocation && (
          <div className="field">
            <label htmlFor="post-location">{t("new_post.location_label")}</label>
            <input id="post-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("new_post.location_placeholder")} autoComplete="off" />
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locatingMe}
              style={{
                display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 13, fontWeight: 700,
                color: lat ? "var(--green-strong)" : "var(--primary-strong)", background: "none", border: "none",
                cursor: locatingMe ? "default" : "pointer", padding: 0,
              }}
            >
              {locatingMe ? <LoaderCircle size={14} className="spin" /> : <MapPin size={14} />}
              {locatingMe ? t("new_post.locating") : lat ? t("new_post.location_added") : t("new_post.add_location")}
            </button>
            {locationError && <p style={{ color: "var(--red)", fontSize: 12, marginTop: 4 }}>{locationError}</p>}
          </div>
        )}

        {isStaff && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 14, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showStaffBadge}
              onChange={(e) => setShowStaffBadge(e.target.checked)}
              style={{ width: 16, height: 16 }}
            />
            {t("new_post.staff_badge_checkbox")}
          </label>
        )}

        {error && <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>}

        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? t("new_post.publishing") : t("new_post.publish")}
        </button>
        </form>
      </div>
    </div>
  );
}
