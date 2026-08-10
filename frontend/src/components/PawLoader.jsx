import { useTranslation } from "react-i18next";

export default function PawLoader({ size = 48, style }) {
  const { t } = useTranslation();
  return (
    <div
      className="paw-loader"
      style={{ width: size, height: size, ...style }}
      role="status"
      aria-label={t("common.loading")}
    />
  );
}
