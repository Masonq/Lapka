import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "../api/client";
import { useToast } from "../ToastContext";
import { useAutoResizeTextarea } from "../useAutoResizeTextarea";
import { useDocumentTitle } from "../useDocumentTitle";
import PhotoPicker from "../components/PhotoPicker";
import { useTranslation } from "react-i18next";

const TYPES = [
  { value: "sell", labelKey: "new_listing.type_sell" },
  { value: "wanted", labelKey: "new_listing.type_wanted" },
  { value: "give_away", labelKey: "new_listing.type_give_away" },
];

// value — то, что реально уходит в backend и хранится у уже существующих
// объявлений (не меняю, чтобы не разойтись со старыми данными), labelKey —
// только то, что показывается пользователю, переводится отдельно
const CATEGORIES = [
  { value: "Корм", labelKey: "new_listing.cat_food" },
  { value: "Игрушки", labelKey: "new_listing.cat_toys" },
  { value: "Аксессуары", labelKey: "new_listing.cat_accessories" },
  { value: "Переноски", labelKey: "new_listing.cat_carriers" },
  { value: "Другое", labelKey: "new_listing.cat_other" },
];

export default function NewListing() {
  const { t } = useTranslation();
  useDocumentTitle(t("new_listing.title"));
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [type, setType] = useState("sell");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const descriptionRef = useAutoResizeTextarea(description);
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
      showToast(t("new_listing.published_toast"));
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
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label={t("new_listing.back_aria")}>
          <ArrowLeft size={17} strokeWidth={2.2} />
        </button>
        <span className="page-title">{t("new_listing.title")}</span>
        <span style={{ width: 44 }} />
      </div>

      <form onSubmit={submit}>
        <div className="field">
          <label id="listing-type-label">{t("new_listing.type_label")}</label>
          <div className="chip-row" role="group" aria-labelledby="listing-type-label" style={{ paddingBottom: 2 }}>
            {TYPES.map((tp) => (
              <button key={tp.value} type="button" className={`chip${type === tp.value ? " active" : ""}`} onClick={() => setType(tp.value)}>
                {t(tp.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <PhotoPicker value={photoUrl} onChange={setPhotoUrl} label={t("new_listing.photo_label")} />

        <div className="field">
          <label htmlFor="listing-title">{t("new_listing.name_label")}</label>
          <input id="listing-title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder={t("new_listing.name_placeholder")} autoComplete="off" />
        </div>

        {type === "sell" && (
          <div className="field">
            <label htmlFor="listing-price">{t("new_listing.price_label")}</label>
            <input id="listing-price" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required autoComplete="off" />
          </div>
        )}

        <div className="field">
          <label id="listing-category-label">{t("new_listing.category_label")}</label>
          <div className="chip-row" role="group" aria-labelledby="listing-category-label" style={{ paddingBottom: 2 }}>
            {CATEGORIES.map((c) => (
              <button key={c.value} type="button" className={`chip${category === c.value ? " active" : ""}`} onClick={() => setCategory(category === c.value ? "" : c.value)}>
                {t(c.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="listing-description">{t("new_listing.description_label")}</label>
          <textarea id="listing-description" ref={descriptionRef} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("new_listing.description_placeholder")} autoComplete="off" style={{ overflow: "hidden", resize: "none" }} />
        </div>

        <div className="field">
          <label htmlFor="listing-city">{t("new_listing.city_label")}</label>
          <input id="listing-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder={t("new_listing.city_placeholder")} autoComplete="off" />
        </div>

        {error && <p style={{ color: "var(--red)", fontSize: 13 }}>{error}</p>}
        <button className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? t("new_listing.publishing") : t("new_listing.publish")}
        </button>
      </form>
    </div>
  );
}
