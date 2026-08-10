import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, PawPrint, MapPin, Sparkles, HeartPulse, Plus, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import WeightChart from "../components/WeightChart";
import DetailCardSkeleton from "../components/DetailCardSkeleton";
import ListItemSkeleton from "../components/ListItemSkeleton";

const HEALTH_CATEGORIES = [
  { value: "vaccination", label: "Вакцинация" },
  { value: "parasite", label: "От паразитов" },
  { value: "medication", label: "Лекарство" },
  { value: "weight", label: "Вес" },
  { value: "vet_visit", label: "Визит к ветеринару" },
];

const CATEGORY_LABELS = Object.fromEntries(HEALTH_CATEGORIES.map((c) => [c.value, c.label]));

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}

export default function PetProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { showToast } = useToast();
  const [pet, setPet] = useState(null);
  const [owner, setOwner] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [health, setHealth] = useState(null);
  const [showHealthForm, setShowHealthForm] = useState(false);
  const [healthForm, setHealthForm] = useState({ category: "vaccination", title: "", value: "", date: "", next_due_date: "" });
  const [healthError, setHealthError] = useState("");
  useDocumentTitle(pet ? pet.name : "Питомец");

  useEffect(() => {
    api.pet(id).then(setPet).catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => {
    if (pet?.owner_id) {
      api.user(pet.owner_id).then(setOwner).catch(() => setOwner(null));
    }
  }, [pet]);

  const isOwner = pet && userId === pet.owner_id;

  function loadHealth() {
    api.petHealth(id).then(setHealth).catch(() => setHealth([]));
  }

  useEffect(() => {
    if (isOwner) loadHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

  async function submitHealth(e) {
    e.preventDefault();
    setHealthError("");
    try {
      await api.addHealthRecord(id, {
        ...healthForm,
        value: healthForm.value ? Number(healthForm.value) : undefined,
        date: healthForm.date ? new Date(healthForm.date).toISOString() : undefined,
        next_due_date: healthForm.next_due_date ? new Date(healthForm.next_due_date).toISOString() : undefined,
      });
      setHealthForm({ category: "vaccination", title: "", value: "", date: "", next_due_date: "" });
      setShowHealthForm(false);
      loadHealth();
      showToast("Запись добавлена");
    } catch (err) {
      setHealthError(err.message);
    }
  }

  async function removeHealthRecord(recordId) {
    await api.deleteHealthRecord(id, recordId);
    loadHealth();
  }

  if (notFound) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Питомец не найден</div>
        Возможно, профиль удалили
      </div>
    );
  }

  if (!pet) {
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
          <DetailCardSkeleton />
        </div>
      </div>
    );
  }

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

        {isOwner && (
          <div className="card" style={{ borderRadius: 20, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <h3 className="subhead" style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                <HeartPulse size={16} /> Здоровье
              </h3>
              <button className="btn btn-ghost" onClick={() => setShowHealthForm((v) => !v)} style={{ padding: "6px 10px" }}>
                <Plus size={14} />
              </button>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-faint)", marginTop: -4, marginBottom: 10 }}>
              Видно только тебе — сюда не попадает никто, кроме владельца
            </p>

            {showHealthForm && (
              <form onSubmit={submitHealth} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid var(--border)" }}>
                <div className="field">
                  <label id="health-category-label">Категория</label>
                  <div className="chip-row" role="group" aria-labelledby="health-category-label" style={{ paddingBottom: 2 }}>
                    {HEALTH_CATEGORIES.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        className={`chip${healthForm.category === c.value ? " active" : ""}`}
                        onClick={() => setHealthForm({ ...healthForm, category: c.value })}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="health-title">Название</label>
                  <input
                    id="health-title"
                    value={healthForm.title}
                    onChange={(e) => setHealthForm({ ...healthForm, title: e.target.value })}
                    required
                    placeholder={healthForm.category === "weight" ? "Например: плановое взвешивание" : "Например: Rabies, Bravecto"}
                  />
                </div>
                {healthForm.category === "weight" && (
                  <div className="field">
                    <label htmlFor="health-value">Вес (кг)</label>
                    <input
                      id="health-value"
                      type="number"
                      step="0.1"
                      min="0"
                      value={healthForm.value}
                      onChange={(e) => setHealthForm({ ...healthForm, value: e.target.value })}
                    />
                  </div>
                )}
                <div className="field">
                  <label htmlFor="health-date">Дата</label>
                  <input
                    id="health-date"
                    type="date"
                    value={healthForm.date}
                    onChange={(e) => setHealthForm({ ...healthForm, date: e.target.value })}
                    required
                  />
                </div>
                {(healthForm.category === "vaccination" || healthForm.category === "parasite") && (
                  <div className="field">
                    <label htmlFor="health-next-due">Следующий раз (для напоминания)</label>
                    <input
                      id="health-next-due"
                      type="date"
                      value={healthForm.next_due_date}
                      onChange={(e) => setHealthForm({ ...healthForm, next_due_date: e.target.value })}
                    />
                  </div>
                )}
                {healthError && <p style={{ color: "var(--red)", fontSize: 13 }}>{healthError}</p>}
                <button className="btn btn-primary btn-block">Сохранить</button>
              </form>
            )}

            {health === null && <ListItemSkeleton count={2} />}
            {health?.length === 0 && <p style={{ fontSize: 13, color: "var(--text-faint)" }}>Записей пока нет</p>}
            {health && <WeightChart records={health.filter((r) => r.category === "weight")} />}
            {health?.map((r) => (
              <div key={r.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 0", borderBottom: "1px solid var(--border)",
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {r.title}{r.value != null ? ` — ${r.value} кг` : ""}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
                    {CATEGORY_LABELS[r.category]} · {formatDate(r.date)}
                    {r.next_due_date ? ` · следующая: ${formatDate(r.next_due_date)}` : ""}
                  </div>
                </div>
                <button className="icon-btn" onClick={() => removeHealthRecord(r.id)} aria-label="Удалить запись">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
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
