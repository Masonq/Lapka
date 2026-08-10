import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function useDocumentTitle(title) {
  const { t } = useTranslation();
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} — Lapki` : t("common.site_tagline");
    return () => {
      document.title = previous;
    };
  }, [title, t]);
}
