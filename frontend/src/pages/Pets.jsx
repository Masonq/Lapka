import { useEffect, useState } from "react";
import EmptyStateImage from "../components/EmptyStateImage";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, PawPrint, Plus, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import PhotoPicker from "../components/PhotoPicker";
import { useTranslation } from "react-i18next";
import { translateSpecies, translateGender, translateActivity } from "../dataLabels";

const SPECIES = ["dog", "cat", "other"];
const GENDERS = ["male", "female"];
const ACTIVITY_LEVELS = ["calm", "medium", "active"];

const EMPTY_FORM = {
  name: "", species: "dog", breed: "", gender: "", age_years: "",
  city: "", activity_level: "", about: "", avatar_url: null,
};

export default function Pets() {
  const { t } = useTranslation();
  useDocumentTitle(t("pets.title"));
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
      showToast(t("pets.added_toast", { name: form.name }));
      load();
    } catch (err) {
      setError(err.message);
      showToast(err.message, "error");
    }
  }

  async function remove(id, name) {
    await api.deletePet(id);
    showToast(t("pets.deleted_toast", { name }));
    load();
  }

  if (!isAuthed) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">{t("pets.login_required_title")}</div>
        {t("pets.login_required_hint")}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("pets.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("pets.title")}</span>
        <button className="btn btn-ghost" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} /> {t("pets.add")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card" style={{ borderRadius: 20, padding: 16, marginBottom: 16 }}>
          <PhotoPicker
            value={form.avatar_url}
            onChange={(url) => setForm({ ...form, avatar_url: url })}
            label={t("pets.photo_label")}
          />
          <div className="field">
            <label htmlFor="pet-name">{t("pets.name_label")}</label>
            <input id="pet-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder={t("pets.name_placeholder")} />
          </div>
          <div className="field">
            <label id="pet-species-label">{t("pets.species_label")}</label>
            <div className="chip-row" role="group" aria-labelledby="pet-species-label" style={{ paddingBottom: 2 }}>
              {SPECIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`chip${form.species === s ? " active" : ""}`}
                  onClick={() => setForm({ ...form, species: s })}
                >
                  {translateSpecies(t, s)}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="pet-breed">{t("pets.breed_label")}</label>
            <input id="pet-breed" value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} placeholder={t("pets.breed_placeholder")} />
          </div>
          <div className="field">
            <label id="pet-gender-label">{t("pets.gender_label")}</label>
            <div className="chip-row" role="group" aria-labelledby="pet-gender-label" style={{ paddingBottom: 2 }}>
              {GENDERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`chip${form.gender === g ? " active" : ""}`}
                  onClick={() => setForm({ ...form, gender: form.gender === g ? "" : g })}
                >
                  {translateGender(t, g)}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="pet-age">{t("pets.age_label")}</label>
            <input id="pet-age" type="number" min="0" value={form.age_years} onChange={(e) => setForm({ ...form, age_years: e.target.value })} placeholder={t("pets.optional_placeholder")} />
          </div>
          <div className="field">
            <label htmlFor="pet-city">{t("pets.city_label")}</label>
            <input id="pet-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={t("pets.optional_placeholder")} />
          </div>
          <div className="field">
            <label id="pet-activity-label">{t("pets.activity_label")}</label>
            <div className="chip-row" role="group" aria-labelledby="pet-activity-label" style={{ paddingBottom: 2 }}>
              {ACTIVITY_LEVELS.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`chip${form.activity_level === a ? " active" : ""}`}
                  onClick={() => setForm({ ...form, activity_level: form.activity_level === a ? "" : a })}
                >
                  {translateActivity(t, a)}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="pet-about">{t("pets.about_label")}</label>
            <textarea id="pet-about" rows={2} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} placeholder={t("pets.about_placeholder")} />
          </div>
          {error && <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>}
          <button className="btn btn-primary btn-block">{t("pets.save")}</button>
        </form>
      )}

      {pets.length === 0 && !showForm && (
        <div className="empty-state">
          <EmptyStateImage />
          <div className="empty-state-title">{t("pets.empty_title")}</div>
          {t("pets.empty_hint")}
        </div>
      )}

      {pets.length > 0 && (
        <div className="card-grid">
          {pets.map((pet) => {
            const avatarTint = pet.species === "dog" ? "var(--blue-tint)" : pet.species === "cat" ? "var(--primary-tint)" : "var(--gray-tint)";
            const avatarColor = pet.species === "dog" ? "var(--blue)" : pet.species === "cat" ? "#95491B" : "var(--text-muted)";
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
                      <img src={pet.avatar_url} alt={t("pets.photo_alt", { name: pet.name })} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <PawPrint size={20} strokeWidth={2.2} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="subhead">{pet.name}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                      {translateSpecies(t, pet.species)}{pet.breed ? `, ${pet.breed}` : ""}{pet.age_years ? ` · ${pet.age_years} ${t("pets.years_short")}` : ""}
                    </div>
                  </div>
                </Link>
                <button className="btn btn-ghost" onClick={() => remove(pet.id, pet.name)} style={{ padding: 9 }} aria-label={t("pets.delete_aria", { name: pet.name })}>
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
