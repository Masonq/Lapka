import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, PawPrint, MapPin, Sparkles } from "lucide-react";
import { api } from "../api/client";
import { useDocumentTitle } from "../useDocumentTitle";

export default function PetProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [owner, setOwner] = useState(null);
  const [notFound, setNotFound] = useState(false);
  useDocumentTitle(pet ? pet.name : "Питомец");

  useEffect(() => {
    api.pet(id).then(setPet).catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => {
    if (pet?.owner_id) {
      api.user(pet.owner_id).then(setOwner).catch(() => setOwner(null));
    }
  }, [pet]);

  if (notFound) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Питомец не найден</div>
        Возможно, профиль удалили
      </div>
    );
  }

  if (!pet) return <div className="empty-state">Загружаем профиль…</div>;

  const avatarTint = pet.species === "Собака" ? "var(--blue-tint)" : pet.species === "Кошка" ? "var(--primary-tint)" : "var(--gray-tint)";
  const avatarColor = pet.species === "Собака" ? "var(--blue)" : pet.species === "Кошка" ? "#95491B" : "var(--text-muted)";

  const facts = [
    pet.species,
    pet.breed,
    pet.gender,
    pet.age_years ? `${pet.age_years} г.` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">Питомец</span>
        <span style={{ width: 44 }} />
      </div>

      <div className="detail-shell">
        <div className="card" style={{ borderRadius: 20, padding: 20, marginBottom: 16, textAlign: "center" }}>
          <div style={{
            width: 96, height: 96, borderRadius: "50%", background: avatarTint, color: avatarColor,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", overflow: "hidden",
          }}>
            {pet.avatar_url ? (
              <img src={pet.avatar_url} alt={`Фото ${pet.name}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <PawPrint size={40} strokeWidth={2} />
            )}
          </div>

          <h2 style={{ fontWeight: 800, fontSize: 22, margin: "0 0 4px" }}>{pet.name}</h2>
          <div style={{ fontSize: 14, color: "var(--text-muted)" }}>{facts}</div>

          {(pet.city || pet.activity_level) && (
            <div style={{ display: "flex", justifyContent: "center", gap: 14, marginTop: 12, flexWrap: "wrap" }}>
              {pet.city && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-muted)" }}>
                  <MapPin size={14} /> {pet.city}
                </span>
              )}
              {pet.activity_level && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "var(--text-muted)" }}>
                  <Sparkles size={14} /> {pet.activity_level}
                </span>
              )}
            </div>
          )}
        </div>

        {pet.about && (
          <div className="card" style={{ borderRadius: 20, padding: 16, marginBottom: 16 }}>
            <h3 className="subhead" style={{ fontSize: 14, marginBottom: 6 }}>О питомце</h3>
            <p style={{ fontSize: 14, color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>{pet.about}</p>
          </div>
        )}

        {owner && (
          <Link to={`/users/${owner.id}`} className="card" style={{
            borderRadius: 20, padding: 16, display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%", background: "var(--primary-tint)", color: "#95491B",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 800, overflow: "hidden",
            }}>
              {owner.avatar_url ? (
                <img src={owner.avatar_url} alt={owner.display_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                owner.display_name?.[0]?.toUpperCase()
              )}
            </div>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-faint)" }}>Владелец</div>
              <div className="subhead" style={{ fontSize: 14 }}>{owner.display_name}</div>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
