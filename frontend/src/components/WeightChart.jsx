import { useTranslation } from "react-i18next";

export default function WeightChart({ records }) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "sr" ? "sr-RS" : "ru-RU";
  // records — записи категории "weight", отсортированные по дате по возрастанию
  const points = records
    .filter((r) => r.value != null)
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 100; // проценты, viewBox масштабируется по ширине контейнера
  const height = 60;
  const padY = 8;

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? width / 2 : (i / (points.length - 1)) * width;
    const y = height - padY - ((p.value - min) / range) * (height - padY * 2);
    return { x, y, value: p.value, date: p.date };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>
        <span>{min} {t("weight_chart.kg")}</span>
        <span>{max} {t("weight_chart.kg")}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 70, display: "block" }} preserveAspectRatio="none">
        <path d={path} fill="none" stroke="var(--primary-strong)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="1.8" fill="var(--primary-strong)" />
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-faint)", marginTop: 4 }}>
        <span>{new Date(coords[0].date).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}</span>
        <span>{new Date(coords[coords.length - 1].date).toLocaleDateString(dateLocale, { day: "numeric", month: "short" })}</span>
      </div>
    </div>
  );
}
