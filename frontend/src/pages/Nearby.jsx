import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, PawPrint, MapPin } from "lucide-react";
import { api } from "../api/client";
import { useDocumentTitle } from "../useDocumentTitle";

const CITIES = ["Белград", "Нови-Сад", "Ниш"];

export default function Nearby() {
  useDocumentTitle("Рядом");
  const navigate = useNavigate();
  const [city, setCity] = useState("Белград");
  const [pets, setPets] = useState(null);

  useEffect(() => {
    setPets(null);
    api.pets({ city }).then(setPets).catch(() => setPets([]));
  }, [city]);

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">Рядом</span>
        <span style={{ width: 44 }} />
      </div>

      <p style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 14 }}>
        Точные координаты никогда не показываются — только город, который питомец указал в профиле
      </p>

      <div className="chip-row" style={{ marginBottom: 16 }}>
        {CITIES.map((c) => (
          <button key={c} className={`chip${city === c ? " active" : ""}`} onClick={() => setCity(c)}>
            {c}
          </button>
        ))}
      </div>

      {pets === null && <p style={{ fontSize: 13, color: "var(--text-faint)" }}>Загружаем…</p>}

      {pets?.length === 0 && (
        <div className="empty-state">
          <MapPin size={28} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
          <div className="empty-state-title">Никого не нашлось</div>
          Пока ни один питомец не указал этот город
        </div>
      )}

      {pets?.length > 0 && (
        <div className="card-grid">
          {pets.map((pet) => {
            const avatarTint = pet.species === "Собака" ? "var(--blue-tint)" : pet.species === "Кошка" ? "var(--primary-tint)" : "var(--gray-tint)";
            const avatarColor = pet.species === "Собака" ? "var(--blue)" : pet.species === "Кошка" ? "#95491B" : "var(--text-muted)";
            return (
              <Link key={pet.id} to={`/pets/${pet.id}`} className="card" style={{
                borderRadius: 20, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%", background: avatarTint, color: avatarColor,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden",
                }}>
                  {pet.avatar_url ? (
                    <img src={pet.avatar_url} alt={`Фото ${pet.name}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <PawPrint size={20} strokeWidth={2.2} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="subhead">{pet.name}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                    {pet.species}{pet.breed ? `, ${pet.breed}` : ""}{pet.age_years ? ` · ${pet.age_years} г.` : ""}
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
