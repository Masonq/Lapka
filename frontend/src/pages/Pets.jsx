import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, PawPrint, Plus, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import PhotoPicker from "../components/PhotoPicker";

const SPECIES = ["Собака", "Кошка", "Другое"];
const GENDERS = ["Мальчик", "Девочка"];
const ACTIVITY_LEVELS = ["Спокойный", "Средний", "Активный"];

const EMPTY_FORM = {
  name: "", species: "Собака", breed: "", gender: "", age_years: "",
  city: "", activity_level: "", about: "", avatar_url: null,
};

export default function Pets() {
  useDocumentTitle("Мои питомцы");
  const navigate = useNavigate();
  const { isAuthed } = useAuth();
  const { showToast } = useToast();
  const [pets, setPets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");

  function load() {
    if (isAuthed) api.myPets().then(setPets).catch(() => setPets([]));
  }

  useEffect(load, [isAuthed]);

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      await api.createPet({
        ...form,
        age_years: form.age_years ? Number(form.age_years) : undefined,
        gender: form.gender || undefined,
        city: form.city || undefined,
        activity_level: form.activity_level || undefined,
        about: form.about || undefined,
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      showToast(`${form.name} добавлен`);
      load();
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    }
  }

  async function remove(id, name) {
    await api.deletePet(id);
    showToast(`${name} удалён`);
    load();
  }

  if (!isAuthed) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Профили питомцев</div>
        Войди, чтобы добавить своего питомца
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">Мои питомцы</span>
        <button className="btn btn-ghost" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} /> Добавить
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card" style={{ borderRadius: 20, padding: 16, marginBottom: 16 }}>
          <PhotoPicker
            value={form.avatar_url}
            onChange={(url) => setForm({ ...form, avatar_url: url })}
            label="Фото (необязательно)"
          />
          <div className="field">
            <label htmlFor="pet-name">Кличка</label>
            <input id="pet-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Например: Бела" />
          </div>
          <div className="field">
            <label id="pet-species-label">Вид</label>
            <div className="chip-row" role="group" aria-labelledby="pet-species-label" style={{ paddingBottom: 2 }}>
              {SPECIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`chip${form.species === s ? " active" : ""}`}
                  onClick={() => setForm({ ...form, species: s })}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="pet-breed">Порода</label>
            <input id="pet-breed" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} placeholder="Необязательно" />
          </div>
          <div className="field">
            <label id="pet-gender-label">Пол</label>
            <div className="chip-row" role="group" aria-labelledby="pet-gender-label" style={{ paddingBottom: 2 }}>
              {GENDERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`chip${form.gender === g ? " active" : ""}`}
                  onClick={() => setForm({ ...form, gender: form.gender === g ? "" : g })}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="pet-age">Возраст (лет)</label>
            <input id="pet-age" type="number" min="0" value={form.age_years} onChange={(e) => setForm({ ...form, age_years: e.target.value })} placeholder="Необязательно" />
          </div>
          <div className="field">
            <label htmlFor="pet-city">Город</label>
            <input id="pet-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Необязательно" />
          </div>
          <div className="field">
            <label id="pet-activity-label">Уровень активности</label>
            <div className="chip-row" role="group" aria-labelledby="pet-activity-label" style={{ paddingBottom: 2 }}>
              {ACTIVITY_LEVELS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`chip${form.activity_level === a ? " active" : ""}`}
                  onClick={() => setForm({ ...form, activity_level: form.activity_level === a ? "" : a })}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="pet-about">Характер и интересы</label>
            <textarea id="pet-about" rows={2} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} placeholder="Например: дружелюбный, любит гонять мяч" />
          </div>
          {error && <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>}
          <button className="btn btn-primary btn-block">Сохранить</button>
        </form>
      )}

      {pets.length === 0 && !showForm && (
        <div className="empty-state">
          <PawPrint size={28} style={{ marginBottom: 8, color: "var(--text-faint)" }} />
          <div className="empty-state-title">Питомцев пока нет</div>
          Добавь первого — это займёт минуту
        </div>
      )}

      {pets.length > 0 && (
        <div className="card-grid">
          {pets.map((pet) => {
            const avatarTint = pet.species === "Собака" ? "var(--blue-tint)" : pet.species === "Кошка" ? "var(--primary-tint)" : "var(--gray-tint)";
            const avatarColor = pet.species === "Собака" ? "var(--blue)" : pet.species === "Кошка" ? "#95491B" : "var(--text-muted)";
            return (
              <div key={pet.id} className="card" style={{
                borderRadius: 20, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 12,
              }}>
                <Link to={`/pets/${pet.id}`} style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}>
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
                <button className="btn btn-ghost" onClick={() => remove(pet.id, pet.name)} style={{ padding: 9 }} aria-label={`Удалить ${pet.name}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
