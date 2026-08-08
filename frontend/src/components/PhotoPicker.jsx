import { useRef, useState } from "react";
import { Camera, X, Loader2 } from "lucide-react";
import { api } from "../api/client";

const MAX_BYTES = 8 * 1024 * 1024;

export default function PhotoPicker({ value, onChange, label = "Фото" }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(value || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Можно загружать только JPEG, PNG или WebP");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Файл слишком большой — максимум 8 МБ");
      return;
    }

    setError("");
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const { url } = await api.uploadImage(file);
      onChange(url);
    } catch (err) {
      setError(err.message);
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
      <label>{label}</label>
      {preview ? (
        <div className="photo-preview">
          <img src={preview} alt="Предпросмотр фото" />
          {uploading && (
            <div className="photo-preview-overlay">
              <Loader2 size={20} className="spin" />
            </div>
          )}
          {!uploading && (
            <button type="button" className="photo-remove" onClick={clear} aria-label="Убрать фото">
              <X size={14} strokeWidth={2.4} />
            </button>
          )}
        </div>
      ) : (
        <button type="button" className="photo-picker-btn" onClick={() => inputRef.current?.click()}>
          <Camera size={20} strokeWidth={2} />
          Добавить фото
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        style={{ display: "none" }}
      />
      {error && <p style={{ color: "var(--red)", fontSize: 13, margin: "6px 0 0" }}>{error}</p>}
    </div>
  );
}
