import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, PawPrint } from "lucide-react";
import ListItemSkeleton from "../components/ListItemSkeleton";
import { useDelayedLoading } from "../useDelayedLoading";
import EmptyStateImage from "../components/EmptyStateImage";
import ErrorState from "../components/ErrorState";
import { api } from "../api/client";
import { useDocumentTitle } from "../useDocumentTitle";
import { useTranslation } from "react-i18next";
import { translateSpecies, translateCity } from "../dataLabels";
import { translateBreed } from "../breeds";

const CITIES = ["Белград", "Нови-Сад", "Ниш"];

export default function Nearby() {
  const { t } = useTranslation();
  useDocumentTitle(t("nearby.title"));
  const navigate = useNavigate();
  const [city, setCity] = useState("Белград");
  const [pets, setPets] = useState(null);
  const showSkeleton = useDelayedLoading(pets === null);
  const [loadError, setLoadError] = useState(false);

  function load() {
    setPets(null);
    setLoadError(false);
    api.pets({ city }).then(setPets).catch(() => setLoadError(true));
  }

  useEffect(load, [city]);

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("nearby.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("nearby.title")}</span>
        <span style={{ width: 44 }} />
      </div>

      <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 14 }}>
        {t("nearby.hint")}
      </p>

      <div className="chip-row" style={{ marginBottom: 16 }}>
        {CITIES.map((c) => (
          <button key={c} className={`chip${city === c ? " active" : ""}`} onClick={() => setCity(c)}>
            {translateCity(t, c)}
          </button>
        ))}
      </div>

      {showSkeleton && !loadError && <ListItemSkeleton />}

      {loadError && <ErrorState onRetry={load} />}

      {!loadError && pets?.length === 0 && (
        <div className="empty-state">
          <EmptyStateImage />
          <div className="empty-state-title">{t("nearby.empty_title")}</div>
          {t("nearby.empty_hint")}
        </div>
      )}

      {!loadError && pets?.length > 0 && (
        <div className="card-grid">
          {pets.map((pet) => {
            const avatarTint = pet.species === "dog" ? "var(--blue-tint)" : pet.species === "cat" ? "var(--primary-tint)" : "var(--gray-tint)";
            const avatarColor = pet.species === "dog" ? "var(--blue)" : pet.species === "cat" ? "#95491B" : "var(--text-muted)";
            return (
              <Link key={pet.id} to={`/pets/${pet.id}`} className="card" style={{
                borderRadius: 20, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%", background: avatarTint, color: avatarColor,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden",
                }}>
                  {pet.avatar_url ? (
                    <img src={pet.avatar_url} alt={t("nearby.photo_alt", { name: pet.name })} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <PawPrint size={20} strokeWidth={2.2} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="subhead">{pet.name}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {translateSpecies(t, pet.species)}{pet.breed ? `, ${translateBreed(t, pet.breed)}` : ""}{pet.age_years ? ` · ${pet.age_years} ${t("nearby.years_short")}` : ""}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
