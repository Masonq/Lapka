import { useRef, useState } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { api } from "../api/client";
import { useTranslation } from "react-i18next";

const MAX_BYTES = 8 * 1024 * 1024;

export default function PhotoPicker({ value, onChange, label }) {
  const { t } = useTranslation();
  const displayLabel = label ?? t("photo_picker.default_label");
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(value || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const isHeic = /\.hei[cf]$/i.test(file.name) || file.type === "image/heic" || file.type === "image/heif";
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError(isHeic ? t("photo_picker.heic_error") : t("photo_picker.wrong_format"));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t("photo_picker.too_large"));
      return;
    }

    setError("");
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const { url } = await api.uploadImage(file);
      onChange(url);
    } catch (err) {
      const isNetworkError = err instanceof TypeError || /fetch|network/i.test(err.message || "");
      setError(isNetworkError ? t("photo_picker.network_error") : err.message);
      setPreview(value || null);
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    setPreview(null);
    onChange(null);
  }

  return (
    <div className="field">
      <label>{displayLabel}</label>
      {preview ? (
        <div className="photo-preview">
          <img src={preview} alt={t("photo_picker.preview_alt")} />
          {uploading && (
            <div className="photo-preview-overlay">
              <Loader2 size={20} className="spin" />
            </div>
          )}
          {!uploading && (
            <button type="button" className="photo-remove" onClick={clear} aria-label={t("photo_picker.remove_aria")}>
              <X size={14} strokeWidth={2.4} />
            </button>
          )}
        </div>
      ) : (
        <button type="button" className="photo-picker-btn" onClick={() => inputRef.current?.click()}>
          <Camera size={20} strokeWidth={2} />
          {t("photo_picker.add_photo")}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={handleFile}
        style={{ display: "none" }}
      />
      {error && <p style={{ color: "var(--red)", fontSize: 13, margin: "6px 0 0" }}>{error}</p>}
    </div>
  );
}
