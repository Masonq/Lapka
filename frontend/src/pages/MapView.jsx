import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { ArrowLeft } from "lucide-react";
import { api } from "../api/client";
import { useDocumentTitle } from "../useDocumentTitle";
import ErrorState from "../components/ErrorState";
import { useDelayedLoading } from "../useDelayedLoading";
import { useTranslation } from "react-i18next";

// Белград — разумный центр по умолчанию, если у постов пока нет геоточек рядом
const BELGRADE_CENTER = [44.7866, 20.4489];

const TYPE_LABELS = { lost: "post_type.lost", found: "post_type.found" };

function pawDivIcon(color) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 30px; height: 30px; border-radius: 50% 50% 50% 0;
      background: ${color}; transform: rotate(-45deg);
      border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -28],
  });
}

const ICONS = {
  lost: pawDivIcon("#D64545"), // var(--red)
  found: pawDivIcon("#2E8340"), // var(--green-strong)
};

export default function MapView() {
  const { t } = useTranslation();
  useDocumentTitle(t("map_view.title"));
  const navigate = useNavigate();
  const [posts, setPosts] = useState(null);
  const showSkeleton = useDelayedLoading(posts === null);
  const [loadError, setLoadError] = useState(false);

  function load() {
    setLoadError(false);
    setPosts(null);
    Promise.all([api.posts({ type: "lost", limit: 100 }), api.posts({ type: "found", limit: 100 })])
      .then(([lost, found]) => {
        const withCoords = [...lost, ...found].filter(
          (p) => p.last_seen_lat != null && p.last_seen_lng != null
        );
        setPosts(withCoords);
      })
      .catch(() => setLoadError(true));
  }

  useEffect(load, []);

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("map_view.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("map_view.title")}</span>
        <span style={{ width: 44 }} />
      </div>

      <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 12 }}>
        {t("map_view.legend")}
        <span style={{ color: "var(--red)", fontWeight: 700 }}> ●</span> {t("map_view.legend_lost")}
        <span style={{ color: "var(--green-strong)", fontWeight: 700 }}> ●</span> {t("map_view.legend_found")}
      </p>

      {loadError && <ErrorState onRetry={load} />}

      {!loadError && showSkeleton && (
        <div style={{ height: "60vh", borderRadius: 20, overflow: "hidden" }} className="skeleton" />
      )}

      {!loadError && posts !== null && (
        <div style={{ height: "60vh", borderRadius: 20, overflow: "hidden", border: "1px solid var(--border)" }}>
          <MapContainer center={BELGRADE_CENTER} zoom={12} style={{ height: "100%", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {posts.map((p) => (
              <Marker key={p.id} position={[p.last_seen_lat, p.last_seen_lng]} icon={ICONS[p.type]}>
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <b>{t(TYPE_LABELS[p.type])}</b>
                    <div style={{ margin: "4px 0", fontWeight: 700 }}>{p.title}</div>
                    <Link to={`/posts/${p.id}`}>{t("map_view.open_post")}</Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {!loadError && posts?.length === 0 && (
        <p style={{ fontSize: 13, color: "var(--text-faint)", textAlign: "center", marginTop: 12 }}>
          {t("map_view.empty")}
        </p>
      )}
    </div>
  );
}
