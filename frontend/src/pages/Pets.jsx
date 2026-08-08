import { useEffect, useState } from "react";
import { PawPrint, Plus, Trash2 } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../AuthContext";
import { useToast } from "../ToastContext";

const SPECIES = ["Собака", "Кошка", "Другое"];

export default function Pets() {
  const { isAuthed } = useAuth();
  const { showToast } = useToast();
  const [pets, setPets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", species: "Собака", breed: "", age_years: "" });
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
      });
      setForm({ name: "", species: "Собака", breed: "", age_years: "" });
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
        <span className="page-title">Мои питомцы</span>
        <button className="btn btn-ghost" onClick={() => setShowForm((v) => !v)}>
          <Plus size={16} /> Добавить
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card" style={{ borderRadius: 20, padding: 16, marginBottom: 16 }}>
          <div className="field">
            <label>Кличка</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="field">
            <label>Вид</label>
            <div className="chip-row" style={{ paddingBottom: 2 }}>
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
            <label>Порода</label>
            <input value={form.breed} onChange={(e) => setForm({ ...form, breed: e.target.value })} />
          </div>
          <div className="field">
            <label>Возраст (лет)</label>
            <input type="number" min="0" value={form.age_years} onChange={(e) => setForm({ ...form, age_years: e.target.value })} />
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

      {pets.map((pet) => {
        const avatarTint = pet.species === "Собака" ? "var(--blue-tint)" : pet.species === "Кошка" ? "var(--yellow-tint)" : "var(--gray-tint)";
        const avatarColor = pet.species === "Собака" ? "var(--blue)" : pet.species === "Кошка" ? "#8A6A00" : "var(--text-muted)";
        return (
          <div key={pet.id} className="card" style={{
            borderRadius: 20, padding: "14px 16px", marginBottom: 10,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", background: avatarTint, color: avatarColor,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <PawPrint size={20} strokeWidth={2.2} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="subhead">{pet.name}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {pet.species}{pet.breed ? `, ${pet.breed}` : ""}{pet.age_years ? ` · ${pet.age_years} г.` : ""}
              </div>
            </div>
            <button className="btn btn-ghost" onClick={() => remove(pet.id, pet.name)} style={{ padding: 9 }} aria-label={`Удалить ${pet.name}`}>
              <Trash2 size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
