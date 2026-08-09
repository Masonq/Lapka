import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../ToastContext";
import { useDocumentTitle } from "../useDocumentTitle";
import PhotoPicker from "../components/PhotoPicker";

const TYPES = [
  { value: "sell", label: "Продать" },
  { value: "wanted", label: "Ищу" },
  { value: "give_away", label: "Отдам даром" },
];

const CATEGORIES = ["Корм", "Игрушки", "Аксессуары", "Переноски", "Другое"];

export default function NewListing() {
  useDocumentTitle("Новое объявление");
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [type, setType] = useState("sell");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [photoUrl, setPhotoUrl] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const listing = await api.createListing({
        type,
        title,
        description: description || undefined,
        price: type === "sell" && price ? Number(price) : undefined,
        category: category || undefined,
        city: city || undefined,
        photo_url: photoUrl || undefined,
      });
      showToast("Объявление опубликовано");
      navigate(`/marketplace/${listing.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Назад">
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">Новое объявление</span>
        <span style={{ width: 44 }} />
      </div>

      <form onSubmit={submit}>
        <div className="field">
          <label id="listing-type-label">Тип</label>
          <div className="chip-row" role="group" aria-labelledby="listing-type-label" style={{ paddingBottom: 2 }}>
            {TYPES.map((t) => (
              <button key={t.value} type="button" className={`chip${type === t.value ? " active" : ""}`} onClick={() => setType(t.value)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <PhotoPicker value={photoUrl} onChange={setPhotoUrl} label="Фото (необязательно)" />

        <div className="field">
          <label htmlFor="listing-title">Название</label>
          <input id="listing-title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Например: Клетка для кота, б/у" />
        </div>

        {type === "sell" && (
          <div className="field">
            <label htmlFor="listing-price">Цена (динары)</label>
            <input id="listing-price" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
        )}

        <div className="field">
          <label id="listing-category-label">Категория</label>
          <div className="chip-row" role="group" aria-labelledby="listing-category-label" style={{ paddingBottom: 2 }}>
            {CATEGORIES.map((c) => (
              <button key={c} type="button" className={`chip${category === c ? " active" : ""}`} onClick={() => setCategory(category === c ? "" : c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="listing-description">Описание</label>
          <textarea id="listing-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Состояние, размер, причина продажи" />
        </div>

        <div className="field">
          <label htmlFor="listing-city">Город</label>
          <input id="listing-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Необязательно" />
        </div>

        {error && <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>}
        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? "Публикуем…" : "Опубликовать"}
        </button>
      </form>
    </div>
  );
}
