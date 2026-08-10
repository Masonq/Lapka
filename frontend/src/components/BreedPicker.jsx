import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BREED_LISTS, translateBreed } from "../breeds";

/**
 * Поле выбора породы с поиском — не плоский ряд чипов (пород слишком много,
 * не поместятся и не сканируются глазами так же быстро, как 2-3 варианта
 * у species/gender), а текстовое поле: печатаешь — список внизу
 * фильтруется, тапаешь по варианту — выбирается. Порода не из списка —
 * не проблема: пункт "Использовать «...»" внизу списка сохраняет
 * произвольный текст как есть, как было раньше (свободный ввод).
 *
 * value — то, что реально хранится в pet.breed: либо нейтральный ключ из
 * breeds.js (если выбрано из списка), либо произвольный текст (если нет).
 * onChange получает именно это значение, не переведённый текст.
 */
export default function BreedPicker({ species, value, onChange }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  const breedList = BREED_LISTS[species] || [];

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleFocus() {
    setQuery("");
    setOpen(true);
  }

  function selectBreed(breedValue) {
    onChange(breedValue);
    setQuery("");
    setOpen(false);
  }

  function selectFreeText() {
    onChange(query.trim());
    setQuery("");
    setOpen(false);
  }

  const filtered = query.trim()
    ? breedList.filter((b) => t(b.labelKey).toLowerCase().includes(query.trim().toLowerCase()))
    : breedList;

  // Пока список открыт и печатаем — показываем то, что реально набрано.
  // Когда список закрыт — показываем перевод уже выбранного значения
  // (или сам текст, если это произвольный ввод, не из списка)
  const displayValue = open ? query : value ? translateBreed(t, value) : "";

  if (breedList.length === 0) {
    // Вид "другое" — нет фиксированного списка пород, обычное поле
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("pets.breed_placeholder")}
      />
    );
  }

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <input
        value={displayValue}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={handleFocus}
        placeholder={t("pets.breed_search_placeholder")}
        autoComplete="off"
        style={{ width: "100%" }}
      />
      {open && (
        <div
          className="card"
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 20,
            maxHeight: 260, overflowY: "auto", padding: 4,
          }}
        >
          {filtered.map((b) => (
            <button
              key={b.value}
              type="button"
              onClick={() => selectBreed(b.value)}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "10px 12px",
                borderRadius: 10, fontSize: 14, background: "none", border: "none", cursor: "pointer",
              }}
            >
              {t(b.labelKey)}
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "10px 12px", fontSize: 13, color: "var(--text-faint)" }}>
              {t("pets.breed_not_found_hint")}
            </div>
          )}
          {query.trim() && (
            <button
              type="button"
              onClick={selectFreeText}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "10px 12px",
                borderRadius: 10, fontSize: 14, color: "var(--primary-strong)", fontWeight: 700,
                background: "none", border: "none", cursor: "pointer", borderTop: "1px solid var(--border)",
              }}
            >
              {t("pets.breed_use_custom", { text: query.trim() })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
